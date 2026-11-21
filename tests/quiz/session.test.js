import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { applyChoice, nextWeek, recordLockTry, startGame } from "../../public/js/game/engine.js";
import { questions, score } from "../../public/js/quiz/quiz.js";
import { buildSession } from "../../public/js/quiz/session.js";

test("six placeholder questions; score counts right answers", () => {
  assert.equal(questions.length, 6);
  for (const q of questions) {
    assert.match(q.text, /^Placeholder:/);
    assert.equal(q.options.length, 4);
  }
  assert.equal(score(questions.map((q) => q.correct)), 6);
  assert.equal(score([9, 9, 9, 9, 9, 9]), 0);
});

test("9. buildSession produces the 3.5 body for a play session", () => {
  let state = startGame();
  state = applyChoice(state, events[0], 0);
  state = applyChoice(state, events[2], 1);
  state = recordLockTry(state, "pay-stub", false);
  state = recordLockTry(state, "pay-stub", true);
  state = nextWeek(state);
  const body = buildSession({ studyGroup: "play", classCode: "P3-TUE", quizBefore: [0, 2, 1, 3, 0, 1], quizAfter: [1, 2, 1, 3, 2, 1], state });
  assert.deepEqual(body, {
    studyGroup: "play",
    classCode: "P3-TUE",
    quizBefore: [0, 2, 1, 3, 0, 1],
    quizAfter: [1, 2, 1, 3, 2, 1],
    game: {
      ending: "cushion",
      finalCash: 62192 - 10000 - 3500,
      finalSavings: 10000,
      finalMood: 4,
      choices: [{ event: "first-savings", choice: 0 }, { event: "concert", choice: 1 }],
      locks: [{ puzzle: "pay-stub", wrongTries: 1, hintUsed: false }],
    },
  });
  const noClass = buildSession({ studyGroup: "play", quizBefore: [], quizAfter: [], state });
  assert.equal("classCode" in noClass, false);
});
