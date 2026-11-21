// Spending events. Room 1 only for now; rooms 2 to 4 come with task `rooms`.
export const events = [
  {
    id: "first-savings",
    week: 1,
    day: 2,
    surprise: false,
    title: "Payday: what goes into savings?",
    body: "The money is in your account. Some of it could go somewhere safe before you start spending.",
    choices: [
      { label: "Save $100", cash: -10000, savings: 10000, result: "Future you says thanks." },
      { label: "Save $40", cash: -4000, savings: 4000, result: "A small start is still a start." },
      { label: "Save nothing", mood: 1, result: "All of it is yours to spend. For now." },
    ],
  },
  {
    id: "work-shoes",
    week: 1,
    day: 4,
    surprise: false,
    title: "Your work shoes are falling apart",
    body: "Your manager says you need closed-toe shoes for your shifts.",
    choices: [
      { label: "A basic pair that does the job", cash: -3500, result: "Comfy enough. Need covered." },
      { label: "The pair you actually want", cash: -9000, mood: 2, result: "They look great. Your balance does not." },
    ],
  },
  {
    id: "concert",
    week: 1,
    day: 6,
    surprise: true,
    title: "A friend invites you to a concert",
    body: "Tickets are $85 and they are going fast.",
    choices: [
      { label: "Buy a ticket", cash: -8500, mood: 2, result: "Best night of the month." },
      { label: "Say no", mood: -1, result: "You hear all about it on Monday." },
      { label: "Pay with savings", savings: -8500, mood: 2, requires: { savings: 8500 }, result: "Fun now, less cushion later." },
    ],
  },
];
