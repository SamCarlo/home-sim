// Practical tips for the month summary (09 §11, task 47). One per month, rotating by monthIndex. Grade 6–7 reading
// level, warm and honest, never preachy (12 §1). Pure data.

export const TIPS = [
  'Pay yourself first: move a little into savings on payday, before you spend on anything else.',
  'An emergency fund of three months of bills turns a car repair from a crisis into an annoyance.',
  'If you pay the full credit card balance every month, you pay no interest at all.',
  'Small things add up. A $5 snack every school day is about $1,250 a year.',
  'Keep rent or a mortgage near a third of your take-home pay. That leaves room for everything else.',
  'Write down what you spend for one week. Most people are surprised where the money goes.',
  'Cooking at home most nights costs far less than eating out, and leftovers make tomorrow’s lunch.',
  'Before a big purchase, wait a day or two. If you still want it, it will still be there.',
  'A higher deductible lowers your insurance bill. Pick one only if your savings can cover it.',
  'Your credit score grows slowly with on-time payments and drops fast with missed ones.',
  'Using less than 30% of your credit card limit helps your credit score.',
  'Free fun counts: the beach, a hike, a game night with friends.',
  'Sleep, movement and time with people you like protect your mental health, and they cost little.',
  'When money is tight, pay housing and utilities first. Those keep a roof over your head and the lights on.',
  'A raise is a chance to save more, not just to spend more.',
  'Compare prices on big bills like phone and internet once a year. Plans change.',
  'Fixing small problems early, like a drip or a squeaky brake, costs less than fixing big ones later.',
  'Investing is for money you won’t need for years. Prices go up and down along the way.',
  'Set a goal with a number and a date, like “$1,000 saved by June.” It is easier to stick to.',
  'Share costs when you can: roommates, carpools and borrowing tools all stretch a paycheck.',
  'Holidays and birthdays happen every year. Save a little each month so December doesn’t sting.',
  'If you can’t pay a bill, call the company before the due date. Many will set up a plan.',
  'Time is money too. A long commute costs gas and hours you could spend on other things.',
  'Celebrate progress. Every month you stick to your plan makes the next one easier.',
];

/** The tip for a month (rotates through TIPS). */
export function tipFor(monthIndex) {
  return TIPS[((monthIndex % TIPS.length) + TIPS.length) % TIPS.length];
}
