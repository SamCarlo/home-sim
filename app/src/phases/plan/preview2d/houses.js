// One house drawing per style family (04 §7, 08 §4). Pure. Each drawer takes a palette {wall, trim, roof, accent} and
// returns { svg, porch: [x, y] }: where the shared-room figures stand (left x, feet y). Homes stay within about
// x 165–315 so the landmark stays visible; they stand on GROUND.
import { car } from './backgrounds.js';
import {
  GROUND as G, INK, GLASS, GLASS_COOL, rect, poly, line, edge, gable, hip, ribs, gableTop, siding, win, shutters,
  door, railing, posts, steps, stones,
} from './shapes.js';

const dark = (x, y, w, h, op = 0.18) => rect(x, y, w, h, '#000', `opacity="${op}"`);

/** Plantation: single-wall board-and-batten on low posts, deep front lānai, jalousies, ribbed metal hip roof, slippers. */
function plantation(p) {
  const x = 180, w = 120, fl = G - 9, top = fl - 40;
  let s = rect(x + 4, fl, w - 8, 9, '#5a4a40') + [0, 1, 2, 3, 4].map((i) => rect(x + 6 + i * 26, fl, 4, 9, '#8a7a6a')).join('');
  s += rect(x, top, w, 40, p.wall, edge()) + siding(x, top, w, 40, 'v', 5);
  s += dark(x, top, 70, 40, 0.22) + rect(x, fl - 2, 70, 2, '#8a6a50'); // recessed lānai and its floor
  s += win(x + 10, top + 10, 14, 16, p.trim, 'jalousie') + door(x + 34, fl, 13, 26, p.accent, p.trim);
  s += win(x + 84, top + 10, 14, 16, p.trim, 'jalousie') + win(x + 102, top + 10, 12, 16, p.trim, 'jalousie');
  s += railing(x + 2, x + 68, fl, 9, p.trim, 5) + posts(x + 2, x + 68, fl, top, 3, p.trim, 3);
  s += hip(x, top, w, 18, p.roof, 9, 24) + ribs(x - 9, x + w + 9, top, (px) => top - 18 * Math.min(1, Math.min(px - x + 9, x + w + 9 - px) / 33));
  s += steps(x + 30, G, 22, 9, 3);
  s += `<ellipse cx="${x + 48}" cy="${G + 2}" rx="2.6" ry="1.2" fill="#3a8ac8"/><ellipse cx="${x + 53}" cy="${G + 3}" rx="2.6" ry="1.2" fill="#e85a4a"/>`;
  return { svg: s, porch: [x + 8, fl] };
}

/** Upcountry: board-and-batten, steep ribbed metal gable, stone chimney, small porch. */
function upcountry(p) {
  const x = 190, w = 100, top = G - 44;
  let s = stones(x + 74, top - 44, 12, 44, '#8a8a84', '#5a5a56');
  s += rect(x, top, w, 44, p.wall, edge()) + siding(x, top, w, 44, 'v', 6, '#000', 0.22);
  s += gable(x, top, w, 40, p.roof, 8) + ribs(x - 8, x + w + 8, top, gableTop(x, top, w, 40, 8), '#000', 7);
  s += win(x + 60, top + 10, 14, 18, p.trim) + win(x + 80, top + 10, 12, 18, p.trim);
  s += dark(x + 6, top + 14, 44, 30, 0.15) + door(x + 30, G, 12, 24, p.trim === '#f2ead8' ? '#6a4a30' : p.roof, p.trim) + win(x + 12, top + 18, 12, 14, p.trim);
  s += poly([[x + 2, top + 16], [x + 52, top + 16], [x + 54, top + 10], [x, top + 10]], p.roof, edge()) + posts(x + 6, x + 50, G, top + 16, 3, p.trim, 2.5);
  return { svg: s, porch: [x + 6, G] };
}

/** Kona: stucco, low-pitch hip roof, side lānai, wide sliders, lava-rock wall and a plumeria. */
function kona(p) {
  const x = 182, w = 116, top = G - 36;
  let s = rect(x, top, w, 36, p.wall, edge());
  s += win(x + 10, top + 9, 30, 18, p.trim, 'picture', GLASS_COOL) + door(x + 50, G - 2, 14, 25, p.accent, p.trim);
  s += dark(x + 74, top + 2, 42, 34, 0.14) + win(x + 80, top + 9, 28, 20, p.trim, 'picture', GLASS_COOL) + posts(x + 76, x + 114, G - 2, top, 3, p.trim, 2.5);
  s += hip(x, top, w, 13, p.roof, 9, 26);
  s += `<path d="M${x - 22} ${G}V${G - 30}" stroke="#8a6a50" stroke-width="3"/><ellipse cx="${x - 22}" cy="${G - 36}" rx="14" ry="9" fill="#4e8a4a"/>`
    + [[-28, -38], [-18, -40], [-24, -32], [-14, -34]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${G + dy}" r="2.2" fill="#fff6e0" stroke="#f2c440" stroke-width="1"/>`).join('');
  s += stones(x - 8, G - 8, 52, 9, '#3e3a38', '#1e1c1c', 2.2) + stones(x + 76, G - 8, 50, 9, '#3e3a38', '#1e1c1c', 2.2);
  return { svg: s, porch: [x + 82, G - 2] };
}

/** Honolulu small lot: two-story modern box with a shed roof, accent band and a carport with a car. */
function honolulu(p) {
  const x = 212, w = 84, top = G - 66;
  let s = rect(x, top, w, 66, p.wall, edge()) + rect(x, top + 30, w, 4, p.accent);
  s += poly([[x - 4, top], [x + w + 6, top - 10], [x + w + 6, top - 5], [x - 4, top + 4]], p.roof, edge());
  s += win(x + 8, top + 8, 30, 16, p.trim, 'picture', GLASS_COOL) + win(x + 48, top + 8, 26, 16, p.trim, 'plain', GLASS_COOL);
  s += win(x + 46, top + 40, 28, 16, p.trim, 'picture', GLASS_COOL) + door(x + 16, G, 14, 24, '#4a4a4a', p.trim);
  s += rect(x - 46, G - 34, 50, 4, p.roof, edge()) + posts(x - 44, x - 4, G, G - 30, 2, '#9a9a96', 2.5);
  s += `<g transform="translate(${x - 44} ${G - 1}) scale(0.78)">${car(0, 0, p.accent)}</g>`;
  return { svg: s, porch: [x + 34, G] };
}

/** Craftsman: low gable with wide eaves and brackets, shingle siding, porch with tapered columns on stone piers. */
function craftsman(p) {
  const x = 188, w = 104, top = G - 42;
  let s = rect(x, top, w, 42, p.wall, edge()) + siding(x, top, w, 42, 'h', 3.5);
  s += gable(x, top, w, 26, p.roof, 14) + line(x - 14, top, x + w + 14, top, p.trim, 2);
  s += [x - 6, x + w / 2 - 22, x + w / 2 + 22, x + w + 6].map((bx) => poly([[bx - 3, top], [bx + 3, top], [bx, top + 6]], p.trim)).join('');
  s += win(x + w / 2 - 7, top - 18, 14, 9, p.trim);
  s += dark(x + 4, top + 12, 62, 30, 0.14) + win(x + 12, top + 18, 18, 14, p.trim) + door(x + 40, G - 4, 14, 24, p.accent, p.trim);
  s += win(x + 74, top + 12, 22, 18, p.trim, 'picture');
  s += poly([[x - 2, top + 13], [x + 70, top + 13], [x + 66, top + 7], [x + 2, top + 7]], p.roof, edge());
  for (const cx of [x + 4, x + 34, x + 64]) {
    s += stones(cx - 4, G - 12, 8, 12, '#8a7a6a', '#5a4a40', 1.6) + poly([[cx - 2, top + 13], [cx + 2, top + 13], [cx + 3.5, G - 12], [cx - 3.5, G - 12]], p.trim);
  }
  s += rect(x + 4, G - 4, 62, 4, '#9a8a7a');
  return { svg: s, porch: [x + 10, G - 4] };
}

/** Brownstone: a four-story row house with a stoop, iron railing and cornice, between two neighbors. */
function brownstone(p) {
  const fh = 22, top = G - 4 * fh - 6;
  let s = '';
  const unit = (x, w, wall, isHome) => {
    let u = rect(x, top, w, G - top, wall, edge()) + rect(x - 2, top - 6, w + 4, 7, '#3a302c') + rect(x, top + 1, w, 2, p.accent);
    for (let f = 0; f < 4; f++) {
      const y = top + 8 + f * fh;
      u += win(x + 8, y, 11, 16, '#e8dcc8', 'plain') + win(x + w - 19, y, 11, 16, '#e8dcc8', 'plain') + rect(x + 7, y - 2, 13, 2, '#e8dcc8') + rect(x + w - 20, y - 2, 13, 2, '#e8dcc8');
    }
    if (isHome) {
      u += rect(x + w / 2 - 7, top + 8 + 2 * fh - 2, 14, 2, p.trim);
      u += door(x + w / 2 - 5, G - 22, 10, 18, '#3a2a20', '#e8dcc8');
      u += poly([[x + w / 2 - 8, G - 22], [x + w / 2 + 8, G - 22], [x + w / 2 + 22, G], [x + w / 2 - 8, G]], '#6a4a3a', edge());
      u += line(x + w / 2 - 8, G - 30, x + w / 2 + 22, G - 8, p.trim, 1.6) + line(x + w / 2 + 22, G - 8, x + w / 2 + 22, G, p.trim, 1.6);
    } else {
      u += door(x + w / 2 - 5, G - 22, 10, 18, '#3a2a20', '#e8dcc8') + poly([[x + w / 2 - 8, G - 22], [x + w / 2 + 8, G - 22], [x + w / 2 + 18, G], [x + w / 2 - 8, G]], '#5a3e30', edge());
    }
    return u;
  };
  s += unit(170, 44, '#9a4436', false) + unit(270, 44, '#6a4a3a', false) + unit(214, 56, p.wall, true);
  return { svg: s, porch: [176, G + 4] };
}

/** Miami deco: stucco box, stepped parapet, eyebrow ledges, porthole, racing stripes and hurricane shutters. */
function deco(p) {
  const x = 186, w = 108, top = G - 44;
  let s = poly([[x + 34, top], [x + 34, top - 8], [x + 44, top - 8], [x + 44, top - 15], [x + 64, top - 15], [x + 64, top - 8], [x + 74, top - 8], [x + 74, top]], p.wall, edge());
  s += rect(x, top, w, 44, p.wall, edge()) + rect(x - 2, top - 3, w + 4, 4, p.trim, edge(0.6));
  s += [0, 4, 8].map((d) => rect(x + w - 16, top + 8 + d, 16, 1.6, p.accent)).join('');
  s += win(x + 10, top + 12, 20, 16, p.trim, 'picture', GLASS_COOL) + rect(x + 8, top + 9, 24, 3, p.accent);
  s += rect(x + 31, top + 12, 6, 16, p.accent) + siding(x + 31, top + 12, 6, 16, 'h', 2, '#000', 0.25);
  s += win(x + 47, top + 6, 14, 14, p.trim, 'round', GLASS_COOL) + door(x + 46, G, 16, 22, p.accent, p.trim);
  s += win(x + 72, top + 12, 18, 16, p.trim, 'picture', GLASS_COOL) + rect(x + 70, top + 9, 22, 3, p.accent);
  s += rect(x - 6, G - 7, 46, 7, p.trim, edge(0.6)) + rect(x + 68, G - 7, 46, 7, p.trim, edge(0.6));
  return { svg: s, porch: [x + 6, G - 7] };
}

/** Texas suburban: two-story brick, hip roof, stone entry arch and a front two-car garage with driveway. */
function texas(p) {
  const x = 178, w = 82, top = G - 62;
  let s = poly([[258, G], [302, G], [318, G + 26], [246, G + 26]], '#c8c4bc');
  s += rect(x, top, w, 62, p.wall, edge()) + siding(x, top, w, 62, 'h', 3, '#5a2a1a', 0.22);
  s += hip(x, top, w, 20, p.roof, 6, 24);
  s += win(x + 10, top + 8, 16, 20, p.trim) + win(x + 54, top + 8, 16, 20, p.trim) + win(x + 10, top + 36, 16, 20, p.trim);
  s += stones(x + 38, top + 32, 22, 30, p.accent, '#8a7a6a', 2) + door(x + 42, G, 14, 24, '#5a3a2a', p.trim);
  s += `<path d="M${x + 40} ${G - 24}a9 7 0 0 1 18 0" fill="none" stroke="${p.trim}" stroke-width="1.5"/>`;
  s += rect(258, G - 34, 46, 34, p.wall, edge()) + siding(258, G - 34, 46, 34, 'h', 3, '#5a2a1a', 0.22);
  s += gable(258, G - 34, 46, 14, p.roof, 4);
  s += rect(263, G - 24, 36, 24, '#f2efe8', edge(0.8)) + siding(263, G - 24, 36, 24, 'h', 4, INK, 0.35);
  return { svg: s, porch: [x + 4, G] };
}

/** Desert: low stucco house, red barrel-tile roof, arched windows, block wall and gravel. */
function desert(p) {
  const x = 184, w = 112, top = G - 36;
  let s = rect(x, top, w, 36, p.wall, edge());
  s += hip(x, top, w, 12, p.roof, 8, 24);
  let tiles = '';
  for (let tx = x - 4; tx < x + w + 6; tx += 4) tiles += `M${tx} ${top - 1}v-${tx < x + 18 || tx > x + w - 20 ? 5 : 10}`;
  s += `<path d="${tiles}" stroke="#7a2a1a" stroke-width="1" opacity="0.4"/>`;
  s += win(x + 12, top + 9, 16, 20, p.trim, 'arched') + win(x + 78, top + 9, 16, 20, p.trim, 'arched');
  s += `<path d="M${x + 48} ${G}V${G - 18}a8 8 0 0 1 16 0V${G}Z" fill="${p.trim}" stroke="${INK}"/>`;
  s += rect(x - 14, G - 10, 56, 10, '#d8c4a4', edge(0.6)) + siding(x - 14, G - 10, 56, 10, 'h', 3.3) + rect(x + 70, G - 10, 56, 10, '#d8c4a4', edge(0.6)) + siding(x + 70, G - 10, 56, 10, 'h', 3.3);
  s += poly([[x + 42, G], [x + 70, G], [x + 76, G + 12], [x + 36, G + 12]], '#c8b090');
  return { svg: s, porch: [x + 30, G + 6] };
}

/** Hillside (Bisbee): small miners' cottages stepped up a slope, tin roofs, and stairs. */
function hillside(p) {
  let s = poly([[150, G + 2], [330, G + 2], [330, G - 46], [290, G - 40], [250, G - 22], [200, G - 6]], '#b89a74');
  const cottage = (x, y, w, h, wall) => rect(x, y - h, w, h, wall, edge()) + gable(x, y - h, w, 10, '#9aa0a4', 4)
    + ribs(x - 4, x + w + 4, y - h, gableTop(x, y - h, w, 10, 4)) + win(x + 6, y - h + 7, 10, 10, p.trim) + door(x + w - 15, y, 9, 15, p.trim, '#ffffff');
  s += cottage(272, G - 40, 40, 24, p.accent) + cottage(204, G - 6, 52, 30, p.wall);
  s += rect(204, G - 6, 52, 8, '#8a7a6a');
  let st = '';
  for (let i = 0; i < 6; i++) st += rect(256 + i * 3, G - 8 - i * 5, 6, 3, '#a89a8a');
  s += st + line(258, G - 10, 278, G - 40, '#6a5a50', 1);
  return { svg: s, porch: [212, G + 2] };
}

/** Mountain cabin: a log cabin with a steep green roof and woodpile, or an A-frame. */
function cabin(p, opts) {
  let s = '';
  if (opts.alt) {
    s += poly([[188, G], [240, G - 96], [292, G]], p.roof, edge()) + ribs(188, 292, G, (px) => G - 96 * (1 - Math.abs(px - 240) / 52));
    s += poly([[204, G - 4], [240, G - 70], [276, G - 4]], p.wall, edge()) + siding(208, G - 64, 64, 60, 'h', 4, '#000', 0.25);
    s += poly([[226, G - 30], [240, G - 56], [254, G - 30]], GLASS, `stroke="${p.trim}" stroke-width="1.5"`) + door(234, G - 4, 12, 20, p.trim === '#efe2c8' ? '#5a3a24' : p.roof);
    s += rect(198, G - 5, 84, 5, '#7a5a3a') + railing(198, 282, G - 5, 7, '#7a5a3a', 6);
  } else {
    const x = 190, w = 100, top = G - 38;
    s += stones(x + 8, top - 30, 12, 68, '#8a8a84', '#5a5a56');
    s += rect(x, top, w, 38, p.wall, edge()) + siding(x, top, w, 38, 'h', 5, '#000', 0.35);
    for (let y = top + 2.5; y < G; y += 5) s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#c8a070" stroke="#6a4a30" stroke-width="0.5"/><circle cx="${x + w}" cy="${y}" r="2.4" fill="#c8a070" stroke="#6a4a30" stroke-width="0.5"/>`;
    s += gable(x, top, w, 38, p.roof, 9) + ribs(x - 9, x + w + 9, top, gableTop(x, top, w, 38, 9));
    s += win(x + 16, top + 10, 16, 14, p.trim) + win(x + 68, top + 10, 16, 14, p.trim) + door(x + 43, G, 14, 24, '#5a3a24', p.trim);
    s += rect(x - 4, G - 3, w + 8, 3, '#6a4a30');
  }
  let wood = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++) wood += `<circle cx="${300 + c * 6 + r * 3}" cy="${G - 3 - r * 5.5}" r="3" fill="#c8a070" stroke="#6a4a30" stroke-width="0.8"/>`;
  return { svg: s + wood, porch: opts.alt ? [206, G - 5] : [196, G] };
}

/** New England: white clapboard Cape with a steep gable, black shutters, center chimney and a red barn. */
function newEngland(p) {
  let s = rect(270, G - 36, 46, 36, p.accent, edge()) + poly([[266, G - 36], [276, G - 52], [310, G - 52], [320, G - 36]], '#3a3c40', edge());
  s += rect(282, G - 24, 22, 24, '#f6f3ec') + line(282, G - 24, 304, G, p.accent, 2) + line(304, G - 24, 282, G, p.accent, 2);
  const x = 192, w = 80, top = G - 40;
  s += rect(x + w / 2 - 6, top - 46, 12, 30, '#8a3a30');
  s += rect(x, top, w, 40, p.wall, edge()) + siding(x, top, w, 40, 'h', 3.5);
  s += gable(x, top, w, 38, p.roof, 6);
  s += win(x + 10, top + 12, 12, 16, '#ffffff') + shutters(x + 10, top + 12, 12, 16, p.trim);
  s += win(x + 58, top + 12, 12, 16, '#ffffff') + shutters(x + 58, top + 12, 12, 16, p.trim);
  s += win(x + w / 2 - 6, top - 24, 12, 12, '#ffffff') + door(x + 33, G, 14, 26, p.trim === '#1f2326' ? '#a8322a' : p.trim, '#ffffff');
  s += steps(x + 30, G + 2, 20, 4, 2);
  return { svg: s, porch: [x + 4, G] };
}

/** Maritime: a row of bright clapboard houses (the middle one is home), or the Alaska variant with a boat on a trailer. */
function maritime(p, opts) {
  if (opts.variant === 'alaska') {
    const x = 186, w = 96, top = G - 40;
    let s = rect(x, top, w, 40, p.wall, edge()) + siding(x, top, w, 40, 'v', 3, '#000', 0.22);
    s += gable(x, top, w, 18, p.roof, 6) + ribs(x - 6, x + w + 6, top, gableTop(x, top, w, 18, 6));
    s += win(x + 12, top + 10, 16, 14, p.trim) + win(x + 62, top + 10, 20, 14, p.trim) + door(x + 38, G - 4, 14, 24, p.accent, p.trim);
    s += rect(x + 30, G - 4, 34, 4, '#8a7a6a') + `<path d="M${x + 18} ${top - 4}V${top - 16}" stroke="#8a8a8a" stroke-width="2"/>`;
    s += `<path d="M286 ${G - 6}H330" stroke="#5a5a5a" stroke-width="2"/><circle cx="300" cy="${G - 3}" r="3.5" fill="#2a2a2e"/><circle cx="316" cy="${G - 3}" r="3.5" fill="#2a2a2e"/>`;
    s += poly([[284, G - 22], [334, G - 22], [326, G - 8], [292, G - 8]], '#f2efe8', edge()) + rect(298, G - 32, 16, 10, '#e8e4dc', edge(0.8)) + rect(284, G - 15, 46, 3, p.accent);
    return { svg: s, porch: [x + 2, G] };
  }
  const colors = [opts.palettes[(opts.index + 1) % opts.palettes.length].wall, p.wall, opts.palettes[(opts.index + 2) % opts.palettes.length].wall];
  let s = '';
  colors.forEach((wall, i) => {
    const x = 172 + i * 46, w = 46, h = i === 1 ? 54 : 46, top = G - h;
    s += rect(x, top, w, h, wall, edge()) + siding(x, top, w, h, 'h', 3.5);
    s += gable(x, top, w, 22, p.roof, 2);
    s += win(x + 8, top + 8, 10, 14, p.trim) + win(x + 28, top + 8, 10, 14, p.trim) + win(x + w / 2 - 4, top - 15, 8, 9, p.trim);
    s += i === 1 ? door(x + 17, G, 12, 22, p.accent, p.trim) + rect(x + 13, G - 2, 20, 2, p.trim) : win(x + 8, top + 30, 10, 12, p.trim) + door(x + 28, G, 10, 18, '#3a3c42', p.trim);
  });
  return { svg: s, porch: [196, G + 4] };
}

/** Appalachian: two-story farmhouse with a green metal roof and a wraparound porch. */
function appalachian(p) {
  const x = 188, w = 96, top = G - 60;
  let s = rect(x, top, w, 60, p.wall, edge()) + siding(x, top, w, 60, 'h', 3.5);
  s += gable(x, top, w, 26, p.roof, 6) + ribs(x - 6, x + w + 6, top, gableTop(x, top, w, 26, 6));
  s += win(x + 14, top + 8, 13, 18, p.trim) + win(x + 69, top + 8, 13, 18, p.trim);
  s += win(x + 14, top + 34, 13, 18, p.trim) + door(x + 42, G - 4, 13, 22, p.accent === '#f6f3ec' ? '#3e6a4a' : p.accent, p.trim) + win(x + 69, top + 34, 13, 18, p.trim);
  s += rect(x + w, G - 24, 22, 24, '#000', 'opacity="0.1"');
  s += poly([[x - 6, G - 22], [x + w + 24, G - 22], [x + w + 20, G - 28], [x - 2, G - 28]], p.roof, edge()) + rect(x - 4, G - 4, w + 26, 4, '#9a8a7a');
  s += posts(x - 2, x + w + 20, G - 4, G - 22, 6, p.trim === '#ffffff' ? '#ffffff' : p.trim, 2.4) + railing(x - 2, x + 36, G - 4, 7, '#ffffff') + railing(x + 60, x + w + 20, G - 4, 7, '#ffffff');
  return { svg: s, porch: [x + 2, G - 4] };
}

/** Delta shotgun: narrow, gable to the street, raised on piers, deep front porch; a neighbor beside it. */
function shotgun(p, opts) {
  let s = '';
  const one = (x, wall, isHome) => {
    const w = 46, fl = G - 8, top = fl - 40;
    let u = [0, 1, 2].map((i) => rect(x + 3 + i * 18, fl, 4, 8, '#8a7a6a')).join('');
    u += rect(x, top, w, 40, wall, edge()) + siding(x, top, w, 40, 'h', 3.5);
    u += gable(x, top, w, 24, p.roof, 4) + ribs(x - 4, x + w + 4, top, gableTop(x, top, w, 24, 4));
    u += dark(x, top + 4, w, 36, 0.14) + win(x + 7, top + 10, 11, 24, p.trim, 'tall') + door(x + 26, fl, 12, 28, isHome ? p.accent : '#6a6e72', p.trim);
    u += posts(x + 1, x + w - 1, fl, top + 3, 3, p.trim, 2.2) + rect(x - 2, top + 1, w + 4, 3, p.trim) + steps(x + 24, G, 16, 8, 3);
    return u;
  };
  s += one(270, opts.palettes[(opts.index + 1) % opts.palettes.length].wall, false) + one(206, p.wall, true);
  return { svg: s, porch: [208, G - 8] };
}

/** Foursquare: boxy two-story with a hip roof, center dormer, full porch and red sandstone foundation. */
function foursquare(p) {
  const x = 198, w = 84, top = G - 64;
  let s = rect(x, top, w, 64, p.wall, edge()) + siding(x, top, w, 64, 'h', 3.5);
  s += hip(x, top, w, 22, p.roof, 6, 30) + rect(x + w / 2 - 9, top - 20, 18, 12, p.wall, edge()) + gable(x + w / 2 - 9, top - 20, 18, 7, p.roof, 2) + win(x + w / 2 - 5, top - 17, 10, 7, p.trim);
  s += win(x + 12, top + 8, 14, 18, p.trim) + win(x + 58, top + 8, 14, 18, p.trim) + win(x + 12, top + 34, 14, 16, p.trim) + door(x + 36, G - 6, 13, 22, p.accent, p.trim) + win(x + 58, top + 34, 14, 16, p.trim);
  s += rect(x - 4, G - 6, w + 8, 6, p.accent, edge(0.6)) + siding(x - 4, G - 6, w + 8, 6, 'v', 6, '#000', 0.25);
  s += hip(x - 2, G - 26, w + 4, 6, p.roof, 4, 6) + posts(x, x + w, G - 6, G - 26, 4, p.trim, 3) + railing(x, x + 30, G - 6, 7, p.trim) + railing(x + 54, x + w, G - 6, 7, p.trim);
  return { svg: s, porch: [x + 4, G - 6] };
}

/** Plains ranch: a long single-story house with a low gable and picture window, a red barn and a grain bin. */
function ranch(p) {
  let s = rect(292, G - 44, 40, 38, p.accent, edge()) + poly([[288, G - 44], [298, G - 60], [326, G - 60], [336, G - 44]], '#5a4e44', edge());
  s += rect(304, G - 28, 16, 22, '#f6f3ec') + line(304, G - 28, 320, G - 6, p.accent, 1.6) + line(320, G - 28, 304, G - 6, p.accent, 1.6);
  s += rect(150, G - 40, 18, 34, '#c8ccd0', edge()) + siding(150, G - 40, 18, 34, 'h', 3, '#000', 0.25) + poly([[148, G - 40], [159, G - 52], [170, G - 40]], '#a8acb0', edge());
  const x = 172, w = 120, top = G - 28;
  s += rect(x, top, w, 28, p.wall, edge()) + siding(x, top, w, 28, 'h', 3);
  s += gable(x, top, w, 11, p.roof, 8);
  s += win(x + 12, top + 7, 36, 14, p.trim, 'picture') + door(x + 60, G, 13, 22, p.trim, '#ffffff') + win(x + 86, top + 7, 14, 12, p.trim) + win(x + 104, top + 7, 10, 12, p.trim);
  s += rect(x + 54, G - 3, 24, 3, '#9a8a7a');
  return { svg: s, porch: [x + 18, G + 2] };
}

const DRAW = {
  'hawaii-plantation': plantation, 'hawaii-upcountry': upcountry, 'kona-coastal': kona, 'honolulu-highrise': honolulu,
  'pnw-urban': craftsman, 'nyc-brownstone': brownstone, 'miami-deco': deco, 'texas-suburban': texas,
  'desert-southwest': desert, 'mountain-cabin': cabin, 'new-england': newEngland, maritime, appalachian,
  'delta-south': shotgun, 'midwest-lakeside': foursquare, 'plains-ranch': ranch,
};

/** Keys with a house drawing (all 16 families). */
export const HOUSE_FAMILIES = Object.keys(DRAW);

/**
 * The regional house for a family: `{ svg, porch: [x, y] }`. opts: { variant, palettes, index, alt }.
 * The `hillside` variant of desert-southwest draws stepped miners' cottages instead.
 */
export function drawHouse(familyKey, palette, opts = {}) {
  if (familyKey === 'desert-southwest' && opts.variant === 'hillside') return hillside(palette, opts);
  const fn = DRAW[familyKey];
  if (!fn) throw new Error(`no house drawing for "${familyKey}"`);
  return fn(palette, { palettes: [palette], index: 0, ...opts });
}

