import { ending } from "../game/engine.js";

// Builds the POST /api/sessions body (ARCHITECTURE.md 3.5). Nothing identifying goes in it.
export function buildSession({ studyGroup, classCode, quizBefore, quizAfter, state }) {
  const body = { studyGroup, quizBefore, quizAfter };
  if (classCode) body.classCode = classCode;
  if (studyGroup === "play") {
    body.game = {
      ending: ending(state),
      finalCash: state.cash,
      finalSavings: state.savings,
      finalMood: state.mood,
      choices: state.log.filter((entry) => entry.choice !== null).map(({ event, choice }) => ({ event, choice })),
      locks: state.locks.map(({ puzzle, wrongTries, hintUsed }) => ({ puzzle, wrongTries, hintUsed })),
    };
  }
  return body;
}
