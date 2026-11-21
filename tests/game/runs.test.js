import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { puzzles } from "../../public/js/content/puzzles.js";
import {
  applyChoice,
  biggestHit,
  checkLock,
  ending,
  formatMoney,
  nextWeek,
  pickSurprise,
  recordLockTry,
  startGame,
} from "../../public/js/game/engine.js";

// Plays a full month the way main.js runs a room: fixed events in order, one surprise, the lock, then nextWeek.
// picks[w] lists the choice index for each fixed event of week w+1, then the surprise's.
function play(picks, random) {
  let state = startGame();
  for (let week = 1; week <= 4; week++) {
    assert.equal(state.week, week);
    const room = [...events.filter((e) => e.week === week && !e.surprise), pickSurprise(events, week, random)];
    assert.equal(picks[week - 1].length, room.length, `week ${week} needs ${room.length} picks`);
    room.forEach((event, i) => (state = applyChoice(state, event, picks[week - 1][i])));
    const puzzle = puzzles.find((p) => p.week === week);
    assert.equal(checkLock(puzzle, puzzle.answer), true);
    state = nextWeek(recordLockTry(state, puzzle.id, true));
  }
  assert.equal(state.finished, true);
  assert.equal(state.day, 30);
  return state;
}

const first = () => 0;
const last = () => 0.999;
const middle = () => 0.5;

// Weeks: [first-savings, work-shoes, surprise], [phone-plan, late-for-work, savings-top-up, surprise],
//        [sneaker-sale, pay-later-earbuds, weekend-plans, surprise], [hours-cut, group-gift, surprise]
const runs = {
  broke: { random: middle, picks: [[2, 1, 0], [1, 1, 2, 0], [0, 0, 0, 0], [0, 0, 0]] },
  scraped: { random: first, picks: [[1, 0, 0], [0, 1, 1, 0], [1, 2, 1, 0], [0, 1, 1]] },
  "made-it": { random: last, picks: [[0, 1, 2], [1, 1, 2, 0], [1, 2, 0, 1], [0, 0, 1]] },
  cushion: { random: first, picks: [[0, 0, 1], [0, 1, 0, 2], [1, 2, 1, 1], [0, 1, 1]] },
  // Needs first, some savings, one treat a week: concert, a ride to work, pizza, the gift.
  sensible: { random: first, picks: [[1, 0, 0], [0, 1, 1, 0], [1, 2, 1, 1], [0, 1, 1]] },
};

for (const [name, run] of Object.entries(runs)) {
  test(`scripted run "${name}" plays through all four weeks`, () => {
    const state = play(run.picks, run.random);
    const outcome = ending(state);
    if (name === "sensible") assert.ok(["made-it", "cushion"].includes(outcome), outcome);
    else assert.equal(outcome, name);
    assert.equal(state.locks.length, 4);
  });
}

test("biggestHit and formatMoney across a full run", () => {
  const state = play(runs.broke.picks, runs.broke.random);
  const hit = biggestHit(state);
  assert.equal(hit.cash, Math.min(...state.log.map((e) => e.cash)));
  assert.equal(hit.label, "Pay in 4 ($175 in total)");
  assert.equal(formatMoney(hit.cash), "-$175.00");
  assert.match(formatMoney(state.cash), /^-\$\d+\.\d\d$/);
  const sensible = play(runs.sensible.picks, runs.sensible.random);
  assert.match(formatMoney(sensible.cash + sensible.savings), /^\$\d+\.\d\d$/);
});
