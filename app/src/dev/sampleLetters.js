// Sample letters for dev seeds (task 25): one solid letter per type, so seeds that finish a letter step store real text.
// Every name is made up. Task 26–28 tests can reuse them as "strong" examples.

/** type id → letter text. */
export const SAMPLE_LETTERS = {
  'rental-cover': 'Dear Ms. Kahale,\n\nMy name is Kai Mana, and I am a dental assistant at a clinic in town. I am applying for '
    + 'the apartment because it is close to my work and I love the quiet neighborhood.\n\nI earn a steady income and I have '
    + 'saved enough for the deposit and two months of rent. I use a monthly budget and I will set up autopay so rent is '
    + 'always on time. I am quiet, clean and respectful, and I will take care of the unit like it is my own.\n\nMy boss and '
    + 'my teacher are happy to be references. Thank you for considering my application.\n\nSincerely,\nKai Mana',
  'cosigner-request': 'Dear Aunty Mele,\n\nI found an apartment I really want, but the landlord needs a co-signer because my '
    + 'income is a little under what they require. Co-signing means you would be responsible for the rent if I could not '
    + 'pay, so I want to be honest about my plan.\n\nI made a budget that covers rent every month with money left for food '
    + 'and gas. I will set up autopay, keep an emergency fund of one month of rent in savings, and share my budget with you '
    + 'every month so you can see how I am doing.\n\nI know this is a big thing to ask. I respect you and I am grateful '
    + 'that you would even think about it. Thank you so much.\n\nLove,\nKai',
  'roommate-intro': 'Hi everyone,\n\nI am Kai, and I work mornings at a coffee shop, so I am usually home by three. I enjoy '
    + 'hiking on weekends and cooking simple dinners.\n\nI like a clean kitchen, so I wash my dishes right away and I am '
    + 'happy to take turns with the bathroom and trash. I keep quiet hours after ten and I use headphones for music. If I '
    + 'have friends over, I will ask first.\n\nIf we ever disagree, I would rather talk it out calmly and listen. I will '
    + 'always pay my share of the rent and bills on time.\n\nI am excited to meet you all. Thanks!\n\nKai',
  'loan-purpose': 'Dear Loan Officer,\n\nThank you for reviewing my application. I am buying this home because it is close to '
    + 'my job and my family, and it has room for us to grow. '
    + 'The neighborhood is safe and quiet, and I plan to live there for a long time.\n\nI have worked as a teacher for over two years and my income '
    + 'is steady. I made a budget, and the monthly payment fits with money left over for bills and savings. I saved for '
    + 'the down payment every month, and I will keep an emergency fund of three months of expenses.\n\nI will set up '
    + 'autopay so every payment is on time. I take this commitment seriously and I am a reliable borrower.\n\nThank you '
    + 'for your time and consideration.\n\nSincerely,\nKai Mana',
  'construction-purpose': 'Dear Loan Officer,\n\nI plan to build a small two-bedroom home on my lot because I want a safe, '
    + 'simple place for my family. I have a budget for the whole project and I will choose a licensed contractor with a '
    + 'clear bid and good references. I compared three bids '
    + 'carefully before choosing one, and I will check on the work every week.\n\nThe builder estimates about nine months to finish. I know building can bring '
    + 'surprises, so I am keeping a contingency fund for unexpected costs or a delay.\n\nOnce the home is built, my steady '
    + 'income covers the mortgage payment every month, and I will use autopay so it is always on time.\n\nThank you for '
    + 'considering my project. Mahalo for your time.\n\nSincerely,\nKai Mana',
  'credit-explanation': 'Dear Loan Officer,\n\nMy credit score is lower than you may like because my credit history is short. '
    + 'I just started working a few years ago and I never had a credit card until recently.\n\nI have always paid my phone '
    + 'bill and my rent on time every month. I am working on my credit by keeping a small balance, using autopay, and '
    + 'following a budget.\n\nI promise to pay every loan payment on time. Thank you for understanding.\n\nRespectfully,\nKai Mana',
};

/** Three rental cover letters for the score-report gallery (?dev=letters, task 28): strong, middling and weak. */
export const REPORT_SAMPLES = [
  { id: 'strong', title: 'Strong sample', type: 'rental-cover', text: SAMPLE_LETTERS['rental-cover'] },
  { id: 'middling', title: 'Middling sample', type: 'rental-cover',
    text: 'Dear Landlord,\n\nMy name is Noa Kealoha and i work at the grocery store in town. I want to rent the apartment '
      + 'becuase its close to my job and I like the area alot.\n\nI have a steady paycheck and I will pay the rent on time '
      + 'every month. I am pretty quiet and I keep things clean.\n\nThank you for reading my letter.\n\nNoa' },
  { id: 'weak', title: 'Weak sample', type: 'rental-cover',
    text: "hi,\n\ni want to rent you're apartment. i have a job and i can pay. my freind says its a nice place so I want it. "
      + "i dont have alot of money saved but i will try my best to pay on time. I hate my old place, the landlord was mean "
      + 'and rude to me!! let me know\n\nJordan' },
];
