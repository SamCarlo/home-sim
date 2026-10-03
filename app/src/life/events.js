// Life events (09 §7, task 44). Pure: the event table as data (text + who/when; the numbers live in config EVENTS) and a
// seeded picker. At most `LIFE.maxRandomEventsPerMonth` random events a month, plus scheduled ones (missed inspection
// findings, contractor defects). Insurable losses charge the deductible when covered, else the whole loss (capped).
import { EVENTS, LIFE } from '../config.js';
import { daysInMonth } from '../util/dates.js';

const OWNER_KINDS = ['condo', 'house', 'build'];
/** True for homeowners (condo, house, build); renters are apartment and shared. */
export const isOwner = (kind) => OWNER_KINDS.includes(kind);

/**
 * The 09 §7 table. `when` keys (all optional, all must pass): months (calendar 0–11), regions, states, locations,
 * homeKinds, owner (true/false), hazards (any of), transport ('car' = mode car, 'carAny' = car or mixed, 'transit' =
 * transit or mixed), settlement, season ('snow' | 'hurricane' from location.seasons), minSocial.
 */
export const EVENT_TABLE = [
  { id: 'car-repair', label: 'Car repair', category: 'transportation', when: { transport: 'car' },
    message: 'Your car needed a repair at the shop.' },
  { id: 'flat-tire', label: 'Flat tire', category: 'transportation', when: { transport: 'carAny' },
    message: 'A nail in the road gave you a flat tire. New tire time.' },
  { id: 'lost-transit-pass', label: 'Lost transit pass', category: 'transportation', when: { transport: 'transit' },
    message: 'You lost your bus pass and had to buy a new one.' },
  { id: 'medical-copay', label: 'Doctor visit', category: 'health', message: 'You got sick and paid the copay at the clinic.' },
  { id: 'dentist', label: 'Dentist', category: 'health', message: 'A toothache meant a filling at the dentist.' },
  { id: 'phone-screen', label: 'Cracked phone screen', category: 'other', message: 'Your phone fell and the screen cracked.' },
  { id: 'appliance-broke', label: 'Appliance broke', category: 'repairs',
    message: 'The fridge stopped working, so you paid for the repair.',
    renterMessage: 'The fridge stopped working. The landlord fixed it for free.' },
  { id: 'plumbing', label: 'Plumbing problem', category: 'repairs', when: { owner: true },
    message: 'A pipe under the sink leaked. You called a plumber.' },
  { id: 'roof-leak', label: 'Roof leak', category: 'repairs', when: { homeKinds: ['house', 'build'] },
    message: 'Rain found a gap in the roof. A roofer patched it.' },
  { id: 'termites', label: 'Termites', category: 'repairs', when: { regions: ['hawaii'], owner: true },
    message: 'Termites were eating the wood. You paid for treatment and repairs.' },
  { id: 'holidays', label: 'Holiday gifts', category: 'gifts', message: 'You bought gifts for family and friends.' },
  { id: 'friends-birthday', label: 'Friend’s birthday', category: 'gifts', message: 'A good friend had a birthday dinner.' },
  { id: 'family-trip', label: 'Family visit', category: 'travel', when: { months: [5, 6, 7] },
    message: 'Family came to visit, so you paid for food and outings.' },
  { id: 'wedding-travel', label: 'Wedding travel', category: 'travel', when: { minSocial: 7 },
    message: 'A friend got married out of town. You traveled to the wedding.' },
  { id: 'hurricane-prep', label: 'Hurricane prep', category: 'other',
    when: { states: ['HI', 'FL', 'TX'], hazards: ['hurricane'], season: 'hurricane' },
    message: 'A storm was coming, so you bought water, batteries and supplies.' },
  { id: 'hurricane-damage', label: 'Hurricane damage', category: 'repairs', insurable: 'hurricane',
    when: { states: ['HI', 'FL', 'TX'], hazards: ['hurricane'], season: 'hurricane' },
    message: 'A hurricane damaged your home and things.' },
  { id: 'flood', label: 'Flood', category: 'repairs', insurable: 'flood', when: { hazards: ['flood'] },
    message: 'Heavy rain flooded the ground floor.' },
  { id: 'heating-spike', label: 'Cold snap heating bill', category: 'utilities', when: { season: 'snow' },
    message: 'A cold snap made the heating bill jump.' },
  { id: 'snow-tow', label: 'Snow tow', category: 'transportation', when: { season: 'snow', transport: 'carAny' },
    message: 'Your car slid into a snowbank and needed a tow.' },
  { id: 'vog-day', label: 'Vog day', category: 'other', when: { locations: ['pahoa', 'kailua-kona'] },
    message: 'Vog from the volcano made the air hazy. You stayed inside.' },
  { id: 'civil-defense-drill', label: 'Civil defense drill', category: 'other', when: { locations: ['pahoa'] },
    message: 'The sirens ran a practice alert. Just a drill, and you knew your plan.' },
  { id: 'wildfire-smoke', label: 'Wildfire smoke', category: 'other',
    when: { locations: ['yellow-pine', 'bisbee', 'valentine', 'waimea'], months: [6, 7, 8] },
    message: 'Smoke from a faraway wildfire filled the sky for a few days.' },
  { id: 'break-in', label: 'Break-in', category: 'other', insurable: 'theft', when: { settlement: ['big-city'] },
    message: 'Someone broke in and took some of your things.' },
  { id: 'kitchen-fire', label: 'Kitchen fire', category: 'repairs', insurable: 'fire',
    message: 'A pan caught fire. Everyone is fine, but the kitchen needs work.' },
  { id: 'work-bonus', label: 'Work bonus', category: 'income', message: 'Your boss gave you a bonus for good work.' },
  { id: 'tax-refund', label: 'Tax refund', category: 'income', when: { months: [3] },
    message: 'Your tax refund arrived.' },
  { id: 'neighbor-gift', label: 'Neighbor’s gift', category: 'food', when: { regions: ['hawaii'] },
    message: 'Your neighbor dropped off fish and ʻulu, so you spent less on groceries.' },
  { id: 'community-cleanup', label: 'Community cleanup', category: 'other',
    message: 'You joined a community cleanup. Mālama ʻāina: caring for the land.' },
];
export const EVENTS_BY_ID = Object.fromEntries(EVENT_TABLE.map((e) => [e.id, e]));

const anyOf = (list, values) => values.some((v) => list.includes(v));

/** Does the event's `when` pass for this context `{location, home, calMonth, choices}`? */
export function eventApplies(event, { location, home, calMonth, choices = {} }) {
  const w = event.when ?? {};
  const mode = location?.living?.transport?.mode;
  if (w.months && !w.months.includes(calMonth)) return false;
  if (w.regions && !w.regions.includes(location?.region)) return false;
  if (w.states && !w.states.includes(location?.state)) return false;
  if (w.locations && !w.locations.includes(location?.id)) return false;
  if (w.homeKinds && !w.homeKinds.includes(home?.kind)) return false;
  if (w.owner !== undefined && isOwner(home?.kind) !== w.owner) return false;
  if (w.hazards && !anyOf(location?.hazards ?? [], w.hazards)) return false;
  if (w.settlement && !w.settlement.includes(location?.settlement)) return false;
  if (w.transport === 'car' && mode !== 'car') return false;
  if (w.transport === 'carAny' && mode === 'transit') return false;
  if (w.transport === 'transit' && mode === 'car') return false;
  if (w.season === 'snow' && !(location?.seasons?.snowMonths ?? []).includes(calMonth)) return false;
  if (w.season === 'hurricane' && !(location?.seasons?.hurricaneMonths ?? []).includes(calMonth)) return false;
  if (w.minSocial && !((choices.social ?? 0) >= w.minSocial)) return false;
  return true;
}

/** The monthly chance of an event (config EVENTS; per-month chances, the high-social ×2, the old-roof multiplier). */
export function eventChance(event, { home, calMonth, choices = {} }) {
  const n = EVENTS[event.id] ?? {};
  let p = n.chanceByMonth ? (n.chanceByMonth[calMonth] ?? 0) : (n.chance ?? 0);
  if (n.highSocial && (choices.social ?? 0) >= n.highSocial) p *= n.highSocialFactor;
  if (event.id === 'roof-leak') p *= home?.modifiers?.roofLeakMultiplier ?? 1;
  return Math.min(1, p);
}

/** Is this insurable loss covered by the home's policy? Flood (and Hawaiʻi hurricane) need their add-on. */
function covered(kind, state, location) {
  const ins = state.paperwork?.options?.insurance;
  if (!ins) return false;
  const addOns = (ins.addOns ?? []).map((a) => a.type);
  const separate = (location?.ownership?.hazardCoverage ?? []).some((h) => h.type === kind);
  if (kind === 'flood') return addOns.includes('flood');
  if (kind === 'hurricane' && separate) return addOns.includes('hurricane');
  return true;
}

/**
 * Money for an insurable loss: `{amountCents, insured {lossCents, deductibleCents, insurerPaysCents}}`. Covered →
 * you pay the deductible (Florida hurricanes use the separate hurricane deductible); uninsured → the whole loss,
 * capped at `LIFE.uninsuredLossCapCents` for gameplay.
 */
export function lossCharge(lossCents, kind, state, location) {
  const opts = state.paperwork?.options ?? {};
  if (!covered(kind, state, location)) {
    const pay = Math.min(lossCents, LIFE.uninsuredLossCapCents);
    return { amountCents: -pay, insured: { lossCents, deductibleCents: 0, insurerPaysCents: 0, uninsured: true } };
  }
  const hd = kind === 'hurricane' ? opts.insurance?.hurricaneDeductible?.lowCents : null;
  const deductibleCents = hd ?? opts.deductibleCents ?? opts.insurance?.deductibleCents ?? 0;
  const pay = Math.min(lossCents, deductibleCents);
  return { amountCents: -pay, insured: { lossCents, deductibleCents, insurerPaysCents: lossCents - pay } };
}

/** Build one concrete event (amount drawn from config) for a context. */
function materialize(event, rng, day, ctx) {
  const n = EVENTS[event.id] ?? {};
  const owner = isOwner(ctx.home?.kind);
  const out = { day, id: event.id, label: event.label, message: event.message, category: event.category, amountCents: 0 };
  if (n.income) out.amountCents = rng.int(n.income[0], n.income[1]);
  else if (n.loss) {
    const range = owner && n.loss.property ? n.loss.property : n.loss.belongings;
    const loss = rng.int(range[0], range[1]);
    Object.assign(out, lossCharge(loss, event.insurable, ctx.state, ctx.location));
  } else if (n.amount) {
    out.amountCents = -rng.int(n.amount[0], n.amount[1]);
    if (event.id === 'appliance-broke' && !owner) Object.assign(out, { amountCents: 0, message: event.renterMessage });
  }
  if (n.wellbeing) out.wellbeing = { ...n.wellbeing };
  return out;
}

/** Scheduled events for the month: missed inspection findings (surprise repairs) and contractor defects. */
export function scheduledEvents(state, monthIndex, rng, days) {
  const opts = state.paperwork?.options ?? {};
  const out = [];
  for (const f of opts.missedFindings ?? []) {
    if (f.month !== monthIndex) continue;
    out.push({ day: rng.int(2, days), id: 'surprise-repair', label: 'Surprise repair', category: 'repairs',
      amountCents: -f.cents, message: `${f.label}. The inspector missed it, so the repair is on you.` });
  }
  const d = opts.contractorRisk?.defect;
  if (d && state.home?.kind === 'build' && d.month === monthIndex) {
    out.push({ day: rng.int(2, days), id: 'contractor-defect', label: 'Contractor defect', category: 'repairs',
      amountCents: -(d.cents ?? rng.int(...EVENTS['contractor-defect'].amount)),
      message: `${d.label ?? 'A building defect showed up'}. The low bid cut corners, and the fix is yours to pay.` });
  }
  return out;
}

/**
 * The month's events (09 §7), sorted by day: each applicable event rolls its chance; if more than the cap hit, sure
 * ones (chance 1) come first and the rest are a seeded shuffle; scheduled events are added on top.
 * ctx = {state, location, home, monthIndex, choices}; rng = a seeded generator (util/rng.js).
 */
export function pickEvents(ctx, rng) {
  const days = daysInMonth(ctx.monthIndex);
  const calMonth = ((ctx.monthIndex % 12) + 12) % 12;
  const c = { ...ctx, calMonth };
  const hits = [];
  for (const e of EVENT_TABLE) {
    if (!eventApplies(e, c)) continue;
    const p = eventChance(e, c);
    if (p > 0 && rng.next() < p) hits.push({ e, sure: p >= 1 });
  }
  const sure = hits.filter((h) => h.sure), rest = rng.shuffle(hits.filter((h) => !h.sure));
  const chosen = [...sure, ...rest].slice(0, LIFE.maxRandomEventsPerMonth);
  const events = chosen.map(({ e }) => materialize(e, rng, rng.int(2, days), c));
  events.push(...scheduledEvents(ctx.state, ctx.monthIndex, rng, days));
  return events.sort((a, b) => a.day - b.day);
}
