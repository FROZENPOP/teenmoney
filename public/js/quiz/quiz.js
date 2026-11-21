// Placeholder questions until task `measure` writes the real ones.
export const questions = [
  { id: "net-pay", text: "Placeholder: which number is your take-home pay?", options: ["Gross pay", "Gross pay minus deductions", "Hours worked", "Hourly rate"], correct: 1 },
  { id: "needs-wants", text: "Placeholder: which of these is a need?", options: ["Concert ticket", "Bus fare to work", "New game", "Takeout"], correct: 1 },
  { id: "spot-charge", text: "Placeholder: a charge you never agreed to shows up. What do you do?", options: ["Ignore it", "Ask the bank about it", "Close your account", "Pay it twice"], correct: 1 },
  { id: "emergency-fund", text: "Placeholder: what is an emergency fund for?", options: ["Holidays", "Surprises you can't avoid", "Shopping sales", "Lending to friends"], correct: 1 },
  { id: "pay-later", text: "Placeholder: buy now, pay later usually costs...", options: ["Less", "The same", "More if you pay late", "Nothing"], correct: 2 },
  { id: "income-drop", text: "Placeholder: your hours get cut. What comes first?", options: ["Wants", "Needs", "Savings goals", "Gifts"], correct: 1 },
];

export function score(answers) {
  return questions.filter((question, i) => answers[i] === question.correct).length;
}
