// Locks on each room's door. Room 1 only for now.
export const puzzles = [
  {
    id: "pay-stub",
    week: 1,
    kind: "code",
    prompt: "The door code is how much was taken out of your pay.",
    document: {
      title: "Pay stub",
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
];
