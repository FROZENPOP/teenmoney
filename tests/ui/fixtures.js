import { startGame } from "../../public/js/game/engine.js";

// Stand-ins with the mockups' example content: a week 2 state, the cracked-phone event, one puzzle per lock kind.

export const week2 = { ...startGame(), week: 2, day: 9, cash: 41250, savings: 6000, mood: 5 };
export const brokenPhone = {
  id: "broken-phone",
  week: 2,
  day: 9,
  surprise: true,
  title: "Your phone screen cracks",
  body: "It still turns on, but half the screen is dead.",
  choices: [
    { label: "Fix it now", cash: -12000, mood: 1, result: "Fixed. That hurt." },
    { label: "Live with it", mood: -2, flag: "phone-cracked", result: "It works, mostly." },
    { label: "Use your savings", savings: -12000, requires: { savings: 12000 }, result: "This is what savings are for." },
  ],
};

export const payStub = {
  id: "pay-stub",
  week: 1,
  kind: "code",
  prompt: "The door code is how much was taken out of your pay.",
  document: {
    title: "Pay stub",
    meta: "Blend Street Smoothies · Days 1 to 30",
    lines: [
      { label: "Hours 60 × $12.00", amount: 72000 },
      { label: "Federal tax", amount: -4300 },
      { label: "Social Security 6.2%", amount: -4464 },
      { label: "Medicare 1.45%", amount: -1044 },
    ],
    answerLabel: "Total taken out",
  },
  answer: 9808,
  hints: ["Look at the lines with a minus sign.", "Add up all three deductions."],
  explain: "43.00 + 44.64 + 10.44 = 98.08.",
};

export const statement = {
  id: "find-the-fee-test",
  week: 2,
  kind: "spot",
  prompt: "One charge on this statement shouldn't be there. Tap it.",
  document: {
    title: "Riverbend Credit Union",
    meta: "Checking ending 4417 · Days 8 to 14",
    lines: [
      ["paycheck", "Day 1", "Blend Street payroll", 62192],
      ["phone-fix", "Day 9", "PhoneFix kiosk", -12000],
      ["market-1", "Day 9", "Corner Market", -847],
      ["to-savings", "Day 10", "Transfer to savings", -2000],
      ["tacos", "Day 11", "Taco Loco", -925],
      ["streammax", "Day 12", "STREAMMAX PREMIUM AUTO-RENEW", -1499],
      ["market-2", "Day 13", "Corner Market", -610],
      ["phone-bill", "Day 14", "Lumen Mobile phone bill", -4500],
    ].map(([id, date, description, amount]) => ({ id, date, description, amount })),
  },
  answer: "streammax",
  hints: ["One company shows up twice.", "Look for AUTO-RENEW."],
  explain: "The free trial renewed itself.",
};

export const gap = {
  id: "close-the-gap-test",
  week: 4,
  kind: "pick",
  prompt: "You're $85.00 short of day 30. Pick the cuts and extra shifts that close the gap.",
  document: {
    title: "Last week, on paper",
    shortfall: 8500,
    options: [
      { id: "skip-movie", label: "Skip movie night", amount: 1800 },
      { id: "pack-lunch", label: "Pack lunch instead of buying it", amount: 1200 },
      { id: "sell-sneakers", label: "Sell your old sneakers", amount: 3500 },
      { id: "extra-shift", label: "Pick up a Saturday shift", amount: 6200, mood: -1 },
      { id: "skip-gift", label: "Leave the group gift", amount: 2500, mood: -2 },
    ],
  },
  answer: ["extra-shift", "skip-movie"],
  hints: ["The shift is the biggest.", "Shift plus one more."],
  explain: "62 + 18 = 80... then add more.",
};
