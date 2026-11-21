// Locks on each room's door, one per week.
export const puzzles = [
  {
    id: "pay-stub",
    week: 1,
    kind: "code",
    prompt: "The door code is how much was taken out of your pay.",
    document: {
      title: "Pay stub",
      meta: "Blend Street Smoothies",
      lines: [
        { label: "Hours 60 x $12.00", amount: 72000 },
        { label: "Federal tax", amount: -4300 },
        { label: "Social Security", amount: -4464 },
        { label: "Medicare", amount: -1044 },
      ],
      answerLabel: "Total taken out",
    },
    answer: 9808,
    hints: ["Look at the lines with a minus sign.", "Add up all three deductions."],
    explain: "43.00 + 44.64 + 10.44 = 98.08. You earned $720.00 and $621.92 reached you.",
  },
  {
    id: "find-the-fee",
    week: 2,
    kind: "spot",
    prompt: "Your coworker Jordan got this statement. One charge is one Jordan never agreed to. Tap it.",
    document: {
      title: "Jordan's bank statement",
      meta: "Days 1 to 10",
      lines: [
        { id: "paycheck", date: "Day 1", description: "Blend Street Smoothies payroll", amount: 62192 },
        { id: "savings-transfer", date: "Day 2", description: "Transfer to savings", amount: -4000 },
        { id: "flixnow-trial", date: "Day 3", description: "FlixNow 7-day free trial", amount: 0 },
        { id: "work-shoes", date: "Day 4", description: "Shoe Barn", amount: -3500 },
        { id: "corner-market", date: "Day 5", description: "Corner Market", amount: -1240 },
        { id: "lunches", date: "Day 7", description: "School cafeteria", amount: -2000 },
        { id: "bus-pass", date: "Day 7", description: "City bus pass", amount: -1500 },
        { id: "flixnow-monthly", date: "Day 10", description: "FLIXNOW PREMIUM MONTHLY", amount: -1499 },
      ],
    },
    answer: "flixnow-monthly",
    hints: ["One company shows up twice.", "A free trial turned into a paid plan. Jordan should call the bank or the company about it."],
    explain: "The FlixNow trial ended and turned into a $14.99 monthly plan Jordan never chose. First step: contact the bank or FlixNow to cancel it and ask for the money back.",
  },
  {
    id: "true-cost",
    week: 3,
    kind: "code",
    prompt: "Same earbuds, two ways to pay. The door code is how much more the pay-later plan costs.",
    document: {
      title: "Checkout",
      meta: "Wireless earbuds",
      options: [
        { label: "Pay today", lines: [{ label: "Price", amount: 16000 }] },
        {
          label: "Pay in 4",
          lines: [
            { label: "Payment 1 of 4", amount: 4200 },
            { label: "Payment 2 of 4", amount: 4200 },
            { label: "Payment 3 of 4", amount: 4200 },
            { label: "Payment 4 of 4", amount: 4200 },
            { label: "Plan fee", amount: 700 },
          ],
        },
      ],
      answerLabel: "The plan costs more by",
    },
    answer: 1500,
    hints: ["Add up everything you'd pay on the plan.", "4 x $42.00 + $7.00, then take away $160.00."],
    explain: "4 x 42.00 = 168.00, plus the 7.00 fee is 175.00. That's 15.00 more than paying 160.00 today.",
  },
  {
    id: "close-the-gap",
    week: 4,
    kind: "pick",
    prompt: "Your coworker Jordan is $70 short for the last week. Pick the moves that close the gap and cost Jordan the least mood.",
    document: {
      title: "Jordan is $70 short for the last week",
      shortfall: 7000,
      options: [
        { id: "saturday-shift", label: "Pick up a Saturday shift", amount: 4200, mood: -2 },
        { id: "sell-old-games", label: "Sell old games", amount: 3000, mood: -1 },
        { id: "skip-takeout", label: "Skip takeout all week", amount: 2400, mood: -1 },
        { id: "bike-to-work", label: "Bike instead of the bus", amount: 1500, mood: -1 },
        { id: "cancel-streaming", label: "Cancel a streaming app", amount: 1200, mood: -1 },
        { id: "skip-movie-night", label: "Skip movie night", amount: 1800, mood: -2 },
      ],
    },
    // Unique answer: no set costing 2 mood or less reaches $70 (best is $54), and the only 3-mood set that does is
    // shift + games ($72). The three cheapest-mood cuts together reach $69, one dollar short.
    answer: ["saturday-shift", "sell-old-games"],
    hints: ["Every move costs some mood. Find the set that costs the least.", "Three small cuts get Jordan to $69. Try one shift instead."],
    explain: "The shift ($42) and selling the games ($30) make $72 for 3 mood. Every other way to reach $70 costs more mood.",
  },
];
