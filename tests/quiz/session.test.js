import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { applyChoice, nextWeek, recordLockTry, startGame } from "../../public/js/game/engine.js";
import { buildSession } from "../../public/js/quiz/session.js";
import worker from "../../worker/index.js";

const quizBefore = [0, 2, 1, 3, 0, 1];
const quizAfter = [1, 2, 1, 3, 2, 1];

function playedWeek() {
  let state = startGame();
  state = applyChoice(state, events[0], 0);
  state = applyChoice(state, events[2], 1);
  state = recordLockTry(state, "pay-stub", false);
  state = recordLockTry(state, "pay-stub", true);
  return nextWeek(state);
}

async function endpointStatus(body) {
  const inserts = [];
  const DB = { prepare: () => ({ bind: (...values) => (inserts.push(values), { run: async () => ({}) }) }) };
  const response = await worker.fetch(new Request("https://teenmoney.test/api/sessions", { method: "POST", body: JSON.stringify(body) }), { DB });
  return { status: response.status, error: (await response.json()).error, inserts: inserts.length };
}

test("5. play session: the 3.5 body, weekly charges left out of choices, accepted by the endpoint", async () => {
  const state = playedWeek();
  assert.ok(state.log.some((entry) => entry.choice === null), "nextWeek logged its charges");
  const body = buildSession({ studyGroup: "play", classCode: "P3-TUE", quizBefore, quizAfter, state });
  assert.deepEqual(body, {
    studyGroup: "play",
    classCode: "P3-TUE",
    quizBefore,
    quizAfter,
    game: {
      ending: "cushion",
      finalCash: 62192 - 10000 - 3500,
      finalSavings: 10000,
      finalMood: 4,
      choices: [{ event: "first-savings", choice: 0 }, { event: "concert", choice: 1 }],
      locks: [{ puzzle: "pay-stub", wrongTries: 1, hintUsed: false }],
    },
  });
  assert.deepEqual(await endpointStatus(body), { status: 201, error: undefined, inserts: 1 });
});

test("5. read session: no game key, accepted by the endpoint", async () => {
  const body = buildSession({ studyGroup: "read", classCode: "P4-WED", quizBefore, quizAfter });
  assert.deepEqual(body, { studyGroup: "read", classCode: "P4-WED", quizBefore, quizAfter });
  assert.equal("game" in body, false);
  assert.deepEqual(await endpointStatus(body), { status: 201, error: undefined, inserts: 1 });
  const withState = buildSession({ studyGroup: "read", quizBefore, quizAfter, state: playedWeek() });
  assert.equal("game" in withState, false);
});

test("5. no class code: the key is left out, and the endpoint accepts it", async () => {
  const body = buildSession({ studyGroup: "play", quizBefore, quizAfter, state: playedWeek() });
  assert.equal("classCode" in body, false);
  assert.equal((await endpointStatus(body)).status, 201);
});
