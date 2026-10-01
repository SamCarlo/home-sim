// Headless Chromium plumbing for tools/shoot.mjs (01 §8): static server, browser launch, CDP client, page sessions.
// Node built-ins plus the global WebSocket only. No npm packages.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.txt': 'text/plain; charset=utf-8',
  '.aff': 'text/plain; charset=utf-8', '.dic': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

/** Serve `root` on 127.0.0.1 at a free port with no caching. Resolves to { url, close }. */
export function startServer(root) {
  const server = http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { rel = '/'; }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(root, path.normalize(rel));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end('forbidden'); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
      });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Launch headless Chromium with the 01 §8 flags and a temp profile. Retries once with --no-sandbox when the
 * sandbox fails. Resolves to { proc, wsUrl, profile, close }.
 */
export async function launchChrome({ width, height, timeout = 20000 }) {
  const bin = process.env.CHROMIUM || '/usr/bin/chromium';
  let lastErr;
  for (const noSandbox of [false, true]) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'homesim-shoot-'));
    const args = [
      '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      `--window-size=${width},${height}`, '--hide-scrollbars', '--mute-audio', '--no-first-run',
      '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
      ...(noSandbox ? ['--no-sandbox'] : []), 'about:blank',
    ];
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let exited = false;
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('exit', () => { exited = true; });
    proc.on('error', (e) => { exited = true; stderr += String(e); });
    const portFile = path.join(profile, 'DevToolsActivePort');
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline && !exited) {
      if (fs.existsSync(portFile)) {
        const [port, wsPath] = fs.readFileSync(portFile, 'utf8').split('\n');
        if (port && wsPath) {
          const wsUrl = `ws://127.0.0.1:${port.trim()}${wsPath.trim()}`;
          return { proc, wsUrl, profile, noSandbox, close: () => killChrome(proc, profile) };
        }
      }
      await sleep(50);
    }
    if (!exited) proc.kill('SIGKILL');
    fs.rmSync(profile, { recursive: true, force: true });
    lastErr = new Error(`Chromium did not start (${bin})${exited ? '' : ' within ' + timeout + ' ms'}:\n${stderr.trim().slice(-1500)}`);
    if (!/sandbox/i.test(stderr)) break; // only a sandbox failure earns the --no-sandbox retry
  }
  throw lastErr;
}

async function killChrome(proc, profile) {
  if (proc.exitCode === null && proc.signalCode === null) {
    const done = new Promise((r) => proc.once('exit', r));
    await Promise.race([done, sleep(3000)]);
    if (proc.exitCode === null && proc.signalCode === null) { proc.kill('SIGKILL'); await Promise.race([done, sleep(2000)]); }
  }
  fs.rmSync(profile, { recursive: true, force: true });
}

/** Minimal CDP client over the global WebSocket with flattened sessions. */
export class CDP {
  /** Connect to the browser endpoint. */
  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', () => reject(new Error('CDP websocket failed to open')), { once: true });
    });
    return new CDP(ws);
  }

  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map(); // sessionId|'' → Set<fn(method, params)>
    ws.addEventListener('message', (ev) => this.onMessage(JSON.parse(ev.data)));
    ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('CDP connection closed'));
      this.pending.clear();
    });
  }

  onMessage(msg) {
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`)); else p.resolve(msg.result);
      return;
    }
    const set = this.handlers.get(msg.sessionId || '');
    if (set) for (const fn of set) fn(msg.method, msg.params);
  }

  /** Send a command; sessionId targets a page session. */
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify(msg));
    });
  }

  /** Subscribe to events for a session ('' = browser). Returns an unsubscribe function. */
  on(sessionId, fn) {
    const key = sessionId || '';
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key).add(fn);
    return () => this.handlers.get(key)?.delete(fn);
  }

  close() { try { this.ws.close(); } catch { /* already closed */ } }
}

/**
 * Open a page (optionally in a fresh browser context), enable Page/Runtime/Log/Network, set the viewport,
 * and collect messages into `log`. `origin` decides which failed requests count as errors.
 */
export async function openPage(cdp, { width, height, origin, freshContext = false, log }) {
  let browserContextId;
  if (freshContext) ({ browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true }));
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', ...(browserContextId ? { browserContextId } : {}) });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const urls = new Map();
  const loadWaiters = new Set();
  const sameOrigin = (u) => { try { return new URL(u).origin === origin; } catch { return false; } };
  const off = cdp.on(sessionId, (method, p) => {
    switch (method) {
      case 'Page.loadEventFired': for (const w of loadWaiters) w(); loadWaiters.clear(); break;
      case 'Runtime.consoleAPICalled': {
        const text = p.args.map(fmtArg).join(' ');
        const where = p.stackTrace?.callFrames?.[0];
        const at = where ? ` (${shortUrl(where.url)}:${where.lineNumber + 1})` : '';
        log.push({ kind: `console.${p.type}`, text: text + at, error: p.type === 'error' || p.type === 'assert' });
        break;
      }
      case 'Runtime.exceptionThrown': {
        const d = p.exceptionDetails;
        const desc = d.exception?.description || d.text;
        const at = d.url ? ` (${shortUrl(d.url)}:${d.lineNumber + 1})` : '';
        log.push({ kind: 'exception', text: desc + at, error: true });
        break;
      }
      case 'Log.entryAdded': {
        const e = p.entry;
        // Network log lines are covered by the Network events below (same-origin only, so external fonts don't fail runs).
        if (e.source === 'network') break;
        log.push({ kind: `log.${e.level}`, text: `${e.text}${e.url ? ` (${shortUrl(e.url)})` : ''}`, error: e.level === 'error' });
        break;
      }
      case 'Network.requestWillBeSent': urls.set(p.requestId, p.request.url); break;
      case 'Network.responseReceived':
        if (p.response.status >= 400 && sameOrigin(p.response.url)) {
          log.push({ kind: 'network', text: `${p.response.status} ${shortUrl(p.response.url)}`, error: true });
        }
        break;
      case 'Network.loadingFailed': {
        const u = urls.get(p.requestId);
        if (u && sameOrigin(u) && !p.canceled) log.push({ kind: 'network', text: `${p.errorText} ${shortUrl(u)}`, error: true });
        break;
      }
      default:
    }
  });
  const s = (method, params) => cdp.send(method, params, sessionId);
  await Promise.all([s('Page.enable'), s('Runtime.enable'), s('Log.enable'), s('Network.enable')]);
  await s('Network.setCacheDisabled', { cacheDisabled: true });
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  return {
    sessionId, targetId, send: s,
    /** Resolve on the next load event (or reject after `ms`). */
    nextLoad(ms) {
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => { loadWaiters.delete(done); reject(new Error(`timeout: page load after ${ms} ms`)); }, ms);
        const done = () => { clearTimeout(t); resolve(); };
        loadWaiters.add(done);
      });
    },
    async close() {
      off();
      await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
      if (browserContextId) await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    },
  };
}

function fmtArg(a) {
  if ('value' in a) return typeof a.value === 'string' ? a.value : JSON.stringify(a.value);
  return a.description ?? a.type;
}

function shortUrl(u) {
  try { const x = new URL(u); return x.protocol.startsWith('http') && x.hostname === '127.0.0.1' ? x.pathname + x.search : u; } catch { return u; }
}
