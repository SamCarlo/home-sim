// Simulate N months of Phase 4 for a life seed (task 44 verification): node tools/sim-months.mjs <seed> [months] [meta.seed]
//   [--choices '{"exercise":4,…}'] [--income <dollars>] [--savings <dollars>]. Prints cash, net worth, credit and wellbeing per month.
import { seeds } from '../app/src/dev/seeds.js';
import { startPlan, startLive, finishLive, nextMonth } from '../app/src/life/monthFlow.js';

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i < 0 ? null : args.splice(i, 2)[1]; };
const choicesArg = flag('--choices'), incomeArg = flag('--income'), savingsArg = flag('--savings');
const [name = 'life-month1-apartment', monthsArg = '12', seedArg] = args;
const s = seeds[name].build(0);
if (seedArg) s.meta.seed = Number(seedArg);
if (savingsArg) s.finances.savingsCents = Math.round(Number(savingsArg) * 100);
if (incomeArg) s.player.netMonthlyIncomeCents = Math.round(Number(incomeArg) * 100);
const $ = (c) => `${c < 0 ? '-' : ''}$${Math.round(Math.abs(c) / 100).toLocaleString('en-US')}`;
console.log(`${name} · seed ${s.meta.seed} · income ${$(s.player.netMonthlyIncomeCents)}/mo`);
for (let m = 0; m < Number(monthsArg); m++) {
  if (s.phase !== 'life') { console.log(`  phase ${s.phase}: ${s.plan.notice?.title}`); break; }
  startPlan(s);
  if (choicesArg) Object.assign(s.life.current.choices, JSON.parse(choicesArg));
  startLive(s);
  s.life.current.care = { shown: 8, hits: 6 };
  const r = finishLive(s);
  const wb = r.wellbeingAfter;
  console.log(`  ${r.label.padEnd(9)} in ${$(r.incomeCents).padStart(7)} out ${$(r.expenseCents).padStart(7)} cash ${$(r.cashAfterCents).padStart(8)}`
    + ` card ${$(r.card?.balanceCents ?? 0).padStart(6)} NW ${$(r.netWorthCents).padStart(9)} credit ${r.creditBefore}→${r.creditAfter}`
    + ` wb P${wb.physical} U${wb.purpose} F${wb.financial} S${wb.social} M${wb.mental}`
    + (r.events.length ? ` · ${r.events.map((e) => `${e.id} ${$(e.amountCents)}`).join(', ')}` : '')
    + (r.missed.length ? ` · MISSED ${r.missed.map((x) => x.kind).join('+')}` : '')
    + (r.evicted ? ' · EVICTED' : ''));
  if (!r.evicted) nextMonth(s);
}
