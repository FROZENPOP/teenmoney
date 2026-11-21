// The six quiz questions, asked before and after (ARCHITECTURE.md section 2, "The quiz"), one per topic in that order.
export const questions = [
  {
    id: "net-pay",
    text: "Your pay stub says you earned $500. Taxes and other deductions take $80 of it. How much money do you actually get to spend?",
    options: ["$500", "$420", "$580", "$80"],
    correct: 1,
    explain: "Take-home pay is what is left after deductions: $500 minus $80 is $420.",
  },
  {
    id: "needs-wants",
    text: "Which of these is a need, not a want?",
    options: [
      "New sneakers when your old pair still fits",
      "A streaming subscription",
      "Concert tickets with friends",
      "A bus pass so you can get to your job",
    ],
    correct: 3,
    explain: "A need is something you have to pay for to live or keep your job. Getting to work is one.",
  },
  {
    id: "spot-charge",
    text: "Your bank statement shows a $9.99 charge from an app you never signed up for. What should you do first?",
    options: [
      "Contact your bank or the company and ask about the charge",
      "Ignore it because it is a small amount",
      "Wait a few months to see if it happens again",
      "Close your bank account right away",
    ],
    correct: 0,
    explain: "Ask about a charge you did not agree to as soon as you see it. Small charges add up, and banks can often reverse them if you act fast.",
  },
  {
    id: "emergency-fund",
    text: "What is an emergency fund for?",
    options: [
      "Buying things while they are on sale",
      "Saving up for a trip",
      "Paying for a cost you did not plan for and cannot skip, like a car repair",
      "Paying your normal bills every month, like your phone",
    ],
    correct: 2,
    explain: "An emergency fund is money set aside for surprises you cannot avoid. Normal bills and fun plans belong in your regular budget.",
  },
  {
    id: "pay-later",
    text: "A store offers to let you \"buy now, pay later\" in four payments. What is the most important thing to check before you say yes?",
    options: [
      "Whether the item comes in more colors",
      "Whether the payments and any late fees add up to more than the price",
      "Whether your friends use the same plan",
      "Nothing, because splitting the cost always makes it cheaper",
    ],
    correct: 1,
    explain: "Add up every payment and the fees for paying late. A pay-later plan can cost more than the price tag.",
  },
  {
    id: "income-drop",
    text: "Your hours at work get cut, so you will earn less next month. What is the best first step?",
    options: [
      "Keep spending the same and hope next month is better",
      "Borrow money to cover the difference",
      "Skip a bill you need, like your phone",
      "Make a new plan: cut back on wants first and keep paying for needs",
    ],
    correct: 3,
    explain: "When income drops, redo your plan. Cut wants first so your needs still get paid, and look for ways to earn a little more.",
  },
];

export function score(answers) {
  return questions.filter((question, i) => answers[i] === question.correct).length;
}
