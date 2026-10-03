// Lifestyle metrics for a table cell's detail panel (04 §6). Pure: a location's base metrics adjusted by home type.
import { homeType } from './homeTypes.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const half = (v) => Math.round(v * 2) / 2;
const stars = (v) => `${v} of 5`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const NOISE_WORDS = ['', 'very quiet', 'quiet', 'some noise', 'busy', 'loud'];
const SCALE_WORDS = ['', 'poor', 'fair', 'good', 'very good', 'excellent'];

/**
 * Ordered lifestyle metrics: [{key, label, icon, kind ('stars'|'bar'|'number'), value, max?, display, meaning}].
 * Values are numbers except `venues`, which is {movieTheaterMiles, concertHallMiles}.
 */
export function cellMetrics(location, homeTypeId) {
  const m = location.metrics;
  const adj = homeType(homeTypeId).metrics;
  const porch = location.region === 'hawaii' ? 'lānai' : 'balcony';
  const noise = clamp(m.noise + adj.noise, 1, 5);
  const garden = clamp(half(m.gardenPotential * adj.gardenFactor), 0, 5);
  const age = m.medianAge + adj.ageDelta;
  const commute = location.living.transport.commuteMinutesOneWay[homeTypeId];
  const word = (v) => SCALE_WORDS[Math.round(v)] || 'none';
  return [
    { key: 'schools', label: 'School quality (approximate)', icon: '🏫', kind: 'stars', value: m.schoolQuality, max: 5,
      display: stars(m.schoolQuality), meaning: `Local public schools rate ${word(m.schoolQuality)}.` },
    { key: 'transit', label: 'Public transportation', icon: '🚌', kind: 'stars', value: m.transit, max: 5,
      display: stars(m.transit), meaning: m.transit <= 2 ? 'You will need a car for most trips.'
        : m.transit >= 4 ? 'Buses or trains can get you most places.' : 'Some bus service; a car still helps.' },
    { key: 'venues', label: 'Movie theater / concert hall', icon: '🎬', kind: 'number',
      value: { movieTheaterMiles: m.movieTheaterMiles, concertHallMiles: m.concertHallMiles },
      display: `${plural(m.movieTheaterMiles, 'mile')} / ${plural(m.concertHallMiles, 'mile')}`,
      meaning: 'How far it is from home to the nearest movie theater or live show.' },
    { key: 'noise', label: 'Noise level', icon: '🔊', kind: 'bar', value: noise, max: 5,
      display: `${noise} of 5 (${NOISE_WORDS[Math.round(noise)]})`,
      meaning: adj.noise > 0 ? 'Shared walls and neighbors close by add some noise.'
        : adj.noise < 0 ? 'A new house on its own lot is quieter than the neighborhood.' : 'About as quiet as the neighborhood.' },
    { key: 'garden', label: 'Garden / farming potential', icon: '🌱', kind: 'stars', value: garden, max: 5,
      display: stars(garden), meaning: `Growing space: ${adj.gardenNote.replace('{porch}', porch)}.` },
    { key: 'garage', label: 'Garage / workshop space', icon: '🔧', kind: 'bar', value: adj.garage, max: 3,
      display: `${adj.garage} of 3`, meaning: `Storage and work space: ${adj.garageLabel}.` },
    { key: 'gym', label: 'Gym, swim and running access', icon: '🏃', kind: 'stars', value: m.gymAccess, max: 5,
      display: stars(m.gymAccess), meaning: `Places to exercise nearby are ${word(m.gymAccess)}.` },
    { key: 'nature', label: 'Access to nature', icon: '🌿', kind: 'stars', value: m.natureAccess, max: 5,
      display: stars(m.natureAccess), meaning: `Trails, beaches, parks and open land are ${word(m.natureAccess)}.` },
    { key: 'neighbor-age', label: 'Average age of neighbors', icon: '👥', kind: 'number', value: age,
      display: `${age} years`, meaning: age < 35 ? 'Mostly young adults and students.'
        : age < 45 ? 'A mix of young families and working adults.' : 'Mostly older adults and retirees.' },
    { key: 'commute', label: 'Typical commute', icon: '🚗', kind: 'number', value: commute,
      display: `${commute} min each way`, meaning: `About ${commute * 2} minutes a day getting to work and back.` },
  ];
}
