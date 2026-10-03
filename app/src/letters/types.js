// Letter types (06 §1): who each letter goes to, what the student is asked to write, a static tip list, greeting and
// closing examples, and the content groups the reader wants covered. Pure data. The feature extractor (task 26) matches
// a group when any of its keywords (case-insensitive substrings) or regexes hits; the tips never tick themselves off.

/**
 * @typedef {{id: string, label: string, keywords: string[], patterns?: RegExp[]}} ContentGroup
 * @typedef {{id: string, title: string, label: string, recipientRole: string, when: string, targetWords: {min: number, max: number},
 *   prompt: string, tips: string[], greetingExamples: string[], closingExamples: string[], groups: ContentGroup[]}} LetterType
 */

const THANKS = { id: 'thanks', label: 'Thank the reader', keywords: ['thank', 'mahalo', 'appreciate', 'grateful', 'gratitude'] };

/** id → letter type. Ids match the paperwork step ids. */
export const LETTER_TYPES = {
  'rental-cover': {
    id: 'rental-cover',
    title: 'Letter: cover letter to the landlord',
    label: 'Cover letter',
    recipientRole: 'the property manager',
    when: 'apartment',
    targetWords: { min: 80, max: 200 },
    prompt: 'Write a short letter to the property manager to go with your rental application. Tell them who you are, '
      + 'why you want this place, and why you would be a good tenant.',
    tips: [
      'Start with a greeting, like "Dear Ms. Kahale,"',
      'Say who you are and what your job is.',
      'Explain why you want to live here.',
      'Show you can pay rent on time: your income, savings or budget.',
      'Show you will be a good neighbor: quiet, clean and respectful.',
      'Offer references.',
      'Say thank you and end with a closing, like "Sincerely,"',
    ],
    greetingExamples: ['Dear Ms. Kahale,', 'Hello Mr. Rivera,', 'Aloha Ms. Kahale,'],
    closingExamples: ['Sincerely,', 'Thank you for your time,', 'Mahalo,'],
    groups: [
      { id: 'who', label: 'Who you are and your job', keywords: ['my name', 'i work', 'my job', 'employed', 'i am a', "i'm a", 'career', 'position'] },
      { id: 'why-place', label: 'Why this place', keywords: ['because', 'close to', 'near', 'love the', 'neighborhood', 'location', 'walk to', 'commute'] },
      { id: 'pay', label: 'You will pay on time', keywords: ['on time', 'income', 'savings', 'saved', 'budget', 'afford', 'pay rent', 'paycheck', 'autopay'] },
      { id: 'neighbor', label: 'You will be a good neighbor', keywords: ['quiet', 'clean', 'respect', 'neighbor', 'tidy', 'take care', 'mālama', 'malama'] },
      { id: 'references', label: 'References available', keywords: ['reference', 'contact my', 'can vouch', 'recommend'] },
      THANKS,
    ],
  },

  'cosigner-request': {
    id: 'cosigner-request',
    title: 'Letter: ask a co-signer',
    label: 'Co-signer request',
    recipientRole: 'a parent or guardian',
    when: 'apartment or shared, when income is under 2.5 times the rent',
    targetWords: { min: 100, max: 220 },
    prompt: 'Your income is a little low for this rent, so the landlord wants a co-signer. Write to a parent or guardian '
      + '(use a made-up name) and ask them to co-sign. Be honest about what it means for them.',
    tips: [
      'Start with a greeting, like "Dear Aunty Mele,"',
      'Explain what co-signing means: they pay if you can\'t.',
      'Explain why you need a co-signer.',
      'Share your budget and how you will pay every month.',
      'Name the steps you will take, like autopay, money saved for surprises, or showing them your budget.',
      'Be respectful and say thank you.',
    ],
    greetingExamples: ['Dear Mom,', 'Dear Aunty Mele,', 'Hi Grandpa,'],
    closingExamples: ['Love,', 'With respect,', 'Thank you so much,'],
    groups: [
      { id: 'meaning', label: 'What co-signing means', keywords: ['co-sign', 'cosign', 'responsible', 'if i can\'t', 'if i cannot', 'if i miss', 'you would pay', 'you would have to'] },
      { id: 'why-need', label: 'Why you need it', keywords: ['income', 'landlord', 'require', 'need a', 'because', 'first apartment', 'no rental history'] },
      { id: 'plan', label: 'Your budget and plan to pay', keywords: ['budget', 'plan', 'each month', 'every month', 'paycheck', 'save', 'pay rent'] },
      { id: 'safeguards', label: 'Specific safeguards', keywords: ['autopay', 'automatic', 'emergency fund', 'savings', 'share my budget', 'show you', 'statement', 'cushion'] },
      { id: 'respect', label: 'Respect and gratitude', keywords: ['thank', 'appreciate', 'grateful', 'respect', 'trust', 'mahalo', 'love'] },
    ],
  },

  'roommate-intro': {
    id: 'roommate-intro',
    title: 'Letter: introduce yourself to the roommates',
    label: 'Roommate introduction',
    recipientRole: 'your future roommates',
    when: 'shared',
    targetWords: { min: 80, max: 200 },
    prompt: 'You will share a house with these people. Write a friendly letter introducing yourself and how you like to '
      + 'live, so they can tell if you would be a good fit.',
    tips: [
      'Start with a greeting, like "Hi everyone,"',
      'Tell them about yourself: your schedule and hobbies.',
      'Say how you handle cleaning and chores.',
      'Talk about quiet hours and guests.',
      'Explain how you handle a disagreement.',
      'Promise to pay your share of the bills on time.',
      'Keep it friendly and end with a closing.',
    ],
    greetingExamples: ['Hi everyone,', 'Aloha, future roommates,', 'Hello all,'],
    closingExamples: ['See you soon,', 'Thanks,', 'Mahalo,'],
    groups: [
      { id: 'about', label: 'About you (schedule, hobbies)', keywords: ['schedule', 'work', 'hobby', 'hobbies', 'i like', 'i enjoy', 'weekend', 'morning', 'night'] },
      { id: 'clean', label: 'Cleanliness and chores', keywords: ['clean', 'chore', 'dishes', 'tidy', 'trash', 'kitchen', 'bathroom'] },
      { id: 'quiet', label: 'Quiet hours and guests', keywords: ['quiet', 'guest', 'friends over', 'music', 'headphones', 'noise', 'visitor'] },
      { id: 'conflict', label: 'How you handle conflict', keywords: ['talk', 'problem', 'disagree', 'conflict', 'listen', 'work it out', 'hoʻoponopono', 'hooponopono', 'compromise'] },
      { id: 'bills', label: 'Paying bills on time', keywords: ['bill', 'rent', 'on time', 'my share', 'split', 'utilities', 'venmo', 'pay'] },
      { id: 'friendly', label: 'Friendly tone', keywords: ['excited', 'happy', 'looking forward', 'nice to meet', 'glad', 'can\'t wait', 'thank'] },
    ],
  },

  'loan-purpose': {
    id: 'loan-purpose',
    title: 'Letter: what the loan is for',
    label: 'Loan purpose letter',
    recipientRole: 'the loan officer',
    when: 'condo or house',
    targetWords: { min: 120, max: 250 },
    prompt: 'Lenders like to know the person behind the application. Write to the loan officer about the home you want '
      + 'to buy and why you will be able to make every payment.',
    tips: [
      'Start with a greeting, like "Dear Loan Officer,"',
      'Describe the home and why you want it.',
      'Explain your job and how steady your income is.',
      'Share your budget and how the payment fits.',
      'Mention your savings or emergency fund.',
      'Promise to pay on time.',
      'Say thank you and end with a closing.',
    ],
    greetingExamples: ['Dear Loan Officer,', 'Dear Mr. Nakamura,', 'To the lending team,'],
    closingExamples: ['Sincerely,', 'Respectfully,', 'Thank you for your consideration,'],
    groups: [
      { id: 'home', label: 'The home and why', keywords: ['home', 'house', 'condo', 'because', 'family', 'close to', 'neighborhood'] },
      { id: 'job', label: 'Job and income stability', keywords: ['job', 'work', 'employed', 'income', 'salary', 'years', 'steady', 'stable', 'career'] },
      { id: 'budget', label: 'Budget and payment plan', keywords: ['budget', 'payment', 'each month', 'every month', 'afford', 'plan'] },
      { id: 'savings', label: 'Savings and emergency fund', keywords: ['savings', 'saved', 'emergency fund', 'down payment', 'reserve', 'cushion'] },
      { id: 'commit', label: 'Commitment to pay on time', keywords: ['on time', 'commit', 'responsible', 'never miss', 'promise', 'autopay', 'reliable'] },
      THANKS,
    ],
  },

  'construction-purpose': {
    id: 'construction-purpose',
    title: 'Letter: your building project',
    label: 'Construction loan letter',
    recipientRole: 'the construction loan officer',
    when: 'build',
    targetWords: { min: 120, max: 250 },
    prompt: 'Building a home is riskier for a lender than buying one. Write to the construction loan officer about what '
      + 'you will build, how you will manage it, and how you will pay once it is done.',
    tips: [
      'Start with a greeting, like "Dear Loan Officer,"',
      'Describe what you will build and why.',
      'Explain your budget and how you will pick a contractor.',
      'Give a timeline.',
      'Say how you will handle surprises: a contingency fund.',
      'Explain how you will make payments after it is built.',
      'Say thank you and end with a closing.',
    ],
    greetingExamples: ['Dear Loan Officer,', 'Dear Ms. Santos,', 'To the construction lending team,'],
    closingExamples: ['Sincerely,', 'Respectfully,', 'Mahalo for your time,'],
    groups: [
      { id: 'what', label: 'What you will build and why', keywords: ['build', 'house', 'home', 'bedroom', 'design', 'square feet', 'because', 'family'] },
      { id: 'budget', label: 'Budget and contractor', keywords: ['budget', 'contractor', 'builder', 'bid', 'cost', 'licensed', 'estimate'] },
      { id: 'timeline', label: 'Timeline', keywords: ['month', 'timeline', 'schedule', 'finish', 'complete', 'by '] },
      { id: 'surprises', label: 'Plan for surprises', keywords: ['contingency', 'surprise', 'unexpected', 'extra', 'cushion', 'emergency', 'delay'] },
      { id: 'payments', label: 'Payments after it is built', keywords: ['payment', 'mortgage', 'pay', 'on time', 'income', 'each month', 'every month'] },
      THANKS,
    ],
  },

  'credit-explanation': {
    id: 'credit-explanation',
    title: 'Letter: explain your credit',
    label: 'Credit explanation',
    recipientRole: 'the loan officer',
    when: 'mortgage or construction loan, when the credit score is under 660',
    targetWords: { min: 80, max: 180 },
    prompt: 'Your credit score is on the low side. Write a short letter to the loan officer explaining why, and what '
      + 'you are doing to build good credit.',
    tips: [
      'Start with a greeting, like "Dear Loan Officer,"',
      'Explain why your credit history is short or low.',
      'Share your on-time habits, like rent or a phone bill.',
      'List the steps you are taking now.',
      'Promise to pay on time.',
      'Say thank you and end with a closing.',
    ],
    greetingExamples: ['Dear Loan Officer,', 'Dear Mr. Fujimoto,', 'To the lending team,'],
    closingExamples: ['Sincerely,', 'Respectfully,', 'Thank you for understanding,'],
    groups: [
      { id: 'why', label: 'Why your credit is short or low', keywords: ['short', 'new', 'young', 'first', 'history', 'because', 'never had', 'just started'] },
      { id: 'habits', label: 'On-time habits', keywords: ['on time', 'rent', 'phone bill', 'every month', 'never late', 'always paid'] },
      { id: 'steps', label: 'Steps you are taking', keywords: ['autopay', 'budget', 'paying down', 'small balance', 'checking', 'learning', 'working on', 'plan'] },
      { id: 'commit', label: 'Commitment', keywords: ['commit', 'promise', 'responsible', 'will pay', 'on time', 'reliable'] },
      THANKS,
    ],
  },
};

/** The letter type for `id` (throws for unknown ids). */
export function letterType(id) {
  const t = LETTER_TYPES[id];
  if (!t) throw new Error(`Unknown letter type "${id}"`);
  return t;
}

/** Letter type ids in 06 §1 order. */
export const LETTER_TYPE_IDS = Object.keys(LETTER_TYPES);
