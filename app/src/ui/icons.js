// Small inline SVG icons for the lifestyle metrics (04 §6). Static markup only (no student text), 24×24, drawn with
// currentColor so they follow the theme. icon(key) → an <svg> element, aria-hidden.

const PATHS = {
  schools: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M7 12v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4"/><path d="M21 10v5"/>',
  transit: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14"/><circle cx="8.5" cy="14" r=".8"/>'
    + '<circle cx="15.5" cy="14" r=".8"/><path d="M8 17l-1.5 3M16 17l1.5 3"/>',
  venues: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 6l2 4M12 6l2 4M17 6l2 4"/>',
  noise: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  garden: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/>'
    + '<path d="M7 21h10"/>',
  garage: '<path d="M3 10l9-6 9 6v10H3z"/><rect x="7" y="13" width="10" height="7"/><path d="M7 16h10"/>',
  gym: '<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M7 11l3-3h4l2 4 3 1"/><path d="M11 15l-1-4"/>',
  nature: '<path d="M2 20l7-11 4 6 3-4 6 9z"/><circle cx="17" cy="6" r="2"/>',
  'neighbor-age': '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/>'
    + '<path d="M14 15.5c1-.9 2-1.3 3-1.3 2.8 0 5 2.2 5 5.8"/>',
  commute: '<path d="M4 16v-4l2-5h12l2 5v4z"/><path d="M4 12h16"/><circle cx="7.5" cy="16.5" r="1.8"/>'
    + '<circle cx="16.5" cy="16.5" r="1.8"/>',
  water: '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-6.5 6-11z"/>',
  hazard: '<path d="M12 3l10 18H2z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".6"/>',
};

/** An inline SVG icon element for a metric key (or 'water' / 'hazard'); a plain dot for unknown keys. */
export function icon(key, { size = 22 } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `icon icon-${key}`);
  svg.innerHTML = PATHS[key] || '<circle cx="12" cy="12" r="4"/>';
  return svg;
}
