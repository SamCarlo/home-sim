// Site utilities (05 §3–§4, task 23): water, power and sewer for the lot, whichever the location supports. Each option
// shows its upgrade cost (out of the design budget) and its monthly effect. Completion stores options.siteUtilities
// ({water, power, sewer, upgradeCents, monthlyDeltaCents, solarKw, catchmentGallons, summary}) for the blueprint's
// defaults (task 39) and Phase 4 bills (task 44), lowers options.designBudgetCents by the upgrades, and re-snapshots.
import { BUILD } from '../../../config.js';
import { formatMoney } from '../../../finance/money.js';
import { byId } from '../../../data/locations/index.js';
import { utilityOptions, siteUtilityPlan, defaultUtilities, projectCost, refreshBuildSnapshot } from '../../../finance/build.js';
import { setStep } from '../flow.js';

const monthlyText = (c) => (c === 0 ? 'no change to your bills' : c < 0 ? `saves ${formatMoney(-c)}/mo` : `+${formatMoney(c)}/mo`);
const optionLabel = (o) => `${o.label}: ${o.upgradeCents ? `+${formatMoney(o.upgradeCents)}` : 'included'}, `
  + `${monthlyText(o.monthlyDeltaCents)}. ${o.note}`;

/** The design budget before upgrades (stored by the loan application, or the default tier's). */
export function baseBudget(state) {
  const o = state?.paperwork?.options ?? {};
  return o.designBudgetBaseCents ?? projectCost(byId[state.choice.locationId], { tierId: o.buildTier ?? BUILD.defaultTier }).designBudgetCents;
}

/** The site-utilities schema for the chosen lot. */
export function utilitiesSchema(state) {
  const loc = byId[state?.choice?.locationId];
  const opts = utilityOptions(loc);
  const def = defaultUtilities(loc);
  const plan = (v) => siteUtilityPlan(loc, { water: v.water || def.water, power: v.power || def.power, sewer: v.sewer || def.sewer });
  const radio = (kind, label) => ({ id: kind, kind: 'radio', label, required: true, default: def[kind],
    options: opts[kind].map((o) => ({ value: o.id, label: optionLabel(o) })) });
  return {
    id: 'site-utilities',
    title: 'Site utilities',
    intro: 'Choose how your house gets water and power and where its waste goes. The basic choice for this lot is '
      + 'already in your site-work cost. Upgrades come out of your design budget, so less is left for the house itself.',
    submitLabel: 'Save my choices',
    sections: [
      { id: 'choices', title: '1. Your utilities', fields: [
        radio('water', 'Water'),
        radio('power', 'Power'),
        radio('sewer', 'Sewer'),
        loc?.water === 'catchment' ? { kind: 'info', tone: 'note', label: 'No county water here',
          text: 'There are no county water pipes out here, so your choices are a rain catchment tank or a well.' } : null,
      ].filter(Boolean) },
      { id: 'effect', title: '2. What it does to your budget', fields: [
        { id: 'base', kind: 'computed', label: 'Design budget', width: 'half', format: 'money', compute: (v, s) => baseBudget(s) },
        { id: 'upgrades', kind: 'computed', label: 'Upgrades', width: 'half', format: 'money', compute: (v) => plan(v).upgradeCents },
        { id: 'left', kind: 'computed', label: 'Left for the house', width: 'half', format: 'money',
          compute: (v, s) => baseBudget(s) - plan(v).upgradeCents },
        { id: 'monthly', kind: 'computed', label: 'Change to monthly bills', width: 'half',
          format: 'money', compute: (v) => plan(v).monthlyDeltaCents },
        { kind: 'info', tone: 'teach', label: 'Pay more now, less later',
          text: 'Solar panels cost a lot up front but cut your electric bill every month for 25 years. Divide the cost by '
            + 'the monthly savings to see how many months it takes to pay for itself.' },
      ] },
    ],
  };
}

export default {
  id: 'site-utilities',
  title: 'Site utilities',
  kind: 'form',
  schema: (state) => utilitiesSchema(state),
  /** Store the plan, take the upgrades out of the design budget, fold the monthly effect into the snapshot. */
  complete(state, values, now = 0) {
    const loc = byId[state.choice.locationId];
    const def = defaultUtilities(loc);
    const plan = siteUtilityPlan(loc, { water: values.water || def.water, power: values.power || def.power, sewer: values.sewer || def.sewer });
    const o = state.paperwork.options;
    o.designBudgetBaseCents = baseBudget(state);
    o.siteUtilities = plan;
    o.designBudgetCents = o.designBudgetBaseCents - plan.upgradeCents;
    refreshBuildSnapshot(state);
    setStep(state, 'site-utilities', 'done', { ...values, water: plan.water, power: plan.power, sewer: plan.sewer }, now);
    return { ok: true, shortfallCents: 0 };
  },
};
