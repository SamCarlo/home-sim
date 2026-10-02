// `?dev=gallery2d`: every place's 2D preview in a labeled grid (04 §7), the visual check for tasks 13–14.
// `&region=hawaii|cities|towns` filters rows; `&type=<home type>|all` picks the column(s) (default all 100 cells).
import { h, clear } from '../ui/dom.js';
import { LOCATIONS, REGION_LABELS } from '../data/locations/index.js';
import { HOME_TYPES } from '../data/enums.js';
import { renderPreviewSVG } from '../phases/plan/preview2d/index.js';

/** Render the gallery into root. */
export function mount(root) {
  delete document.body.dataset.ready;
  clear(root);
  const params = new URLSearchParams(location.search);
  const region = params.get('region');
  const typeParam = params.get('type') || 'all';
  const types = typeParam === 'all' ? HOME_TYPES : [HOME_TYPES.includes(typeParam) ? typeParam : 'house'];
  const places = LOCATIONS.filter((l) => !region || l.region === region);

  const grid = h('div', { class: 'dev-g2d-grid', style: { gridTemplateColumns: `repeat(${types.length === 1 ? 4 : 5}, 1fr)` } });
  for (const loc of places) {
    for (const typeId of types) {
      const art = h('div', { class: 'dev-g2d-art' });
      // Our own SVG string; every text node in it went through escapeHtml.
      art.innerHTML = renderPreviewSVG({ location: loc, homeTypeId: typeId });
      grid.append(h('figure', { class: 'dev-g2d-cell' }, art,
        h('figcaption', null, `${loc.name} · ${typeId} · ${loc.landmark}`)));
    }
  }
  root.append(h('section', { class: 'dev-g2d' },
    h('h2', null, `2D previews: ${region ? REGION_LABELS[region] : 'all places'} (${typeParam})`), grid));
  document.body.dataset.ready = '1';
  return () => { delete document.body.dataset.ready; };
}
