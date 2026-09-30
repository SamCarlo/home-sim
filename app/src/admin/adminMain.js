// Admin console boot (01 §5 step 8). Placeholder until task 52.
import { h } from '../ui/dom.js';

const root = document.getElementById('admin');
root.append(h('section', { class: 'placeholder card' },
  h('span', { class: 'phase-tag' }, 'admin'),
  h('h2', null, 'Admin console — coming in task 52'),
));
document.body.dataset.ready = '1';
