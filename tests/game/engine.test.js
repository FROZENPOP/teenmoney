import assert from "node:assert/strict";
import { test } from "node:test";
import { puzzles } from "../../public/js/content/puzzles.js";
import {
  applyChoice,
  biggestHit,
  checkLock,
  ending,
  formatMoney,
  hintsToShow,
  nextWeek,
  pickSurprise,
  recordLockTry,
  startGame,
} from "../../public/js/game/engine.js";

const payStub = puzzles.find((p) => p.id === "pay-stub");
const event = {
  id: "test-event",
  week: 1,
  day: 4,
  surprise: false,
  choices: [
    { label: "Spend", cash: -3000, savings: 1000, mood: 3, flag: "spent" },
    { label: "Sulk", mood: -20 },
    { label: "Use savings", savings: -5000, requires: { savings: 5000 } },
  ],
};

test("1. startGame returns the starting state", () => {
  assert.deepEqual(startGame(), {
    day: 1, week: 1, cash: 62192, savings: 0, mood: 5, flags: [], log: [], locks: [], finished: false,
  });
});

test("2. applyChoice applies meters, flag, log and day without mutating", () => {
  const before = startGame();
  const copy = structuredClone(before);
  const after = applyChoice(before, event, 0);
  assert.deepEqual(before, copy);
  assert.equal(after.cash, 62192 - 3000);
  assert.equal(after.savings, 1000);
  assert.equal(after.mood, 8);
  assert.deepEqual(after.flags, ["spent"]);
  assert.equal(after.day, 4);
  assert.deepEqual(after.log, [{ week: 1, event: "test-event", choice: 0, label: "Spend", cash: -3000, savings: 1000, mood: 3 }]);
  assert.equal(applyChoice(after, event, 0).mood, 10, "clamped at 10");
  assert.equal(applyChoice(before, event, 1).mood, 0, "clamped at 0");
});

test("3. applyChoice throws on bad input", () => {
  assert.throws(() => applyChoice(startGame(), event, 3), /no choice 3/);
  assert.throws(() => applyChoice(startGame(), event, 2), /needs savings/);
  assert.throws(() => applyChoice({ ...startGame(), finished: true }, event, 0), /finished/);
  assert.doesNotThrow(() => applyChoice({ ...startGame(), savings: 5000 }, event, 2));
});

test("4. checkLock accepts 9808 for pay-stub and rejects other numbers", () => {
  assert.equal(checkLock(payStub, 9808), true);
  for (const wrong of [62192, 9807, 98.08, 0]) assert.equal(checkLock(payStub, wrong), false);
  assert.throws(() => checkLock({ ...payStub, kind: "dial" }, 1), /unknown lock kind "dial"/);
});

test("5. recordLockTry counts wrong tries and hintsToShow follows the lock rules", () => {
  let state = startGame();
  const hintCounts = [];
  for (let i = 1; i <= 4; i++) {
    state = recordLockTry(state, "pay-stub", false);
    hintCounts.push(hintsToShow(state, payStub).length);
    assert.equal(state.locks[0].wrongTries, i);
    assert.equal(state.locks[0].hintUsed, i >= 4);
  }
  assert.deepEqual(hintCounts, [0, 1, 2, 2]);
  assert.deepEqual(hintsToShow(startGame(), payStub), []);
  assert.deepEqual(hintsToShow(state, payStub), payStub.hints);
  const solved = recordLockTry(state, "pay-stub", true);
  assert.deepEqual(solved.locks, [{ puzzle: "pay-stub", wrongTries: 4, hintUsed: true }]);
  assert.equal(recordLockTry(startGame(), "other", true).locks[0].wrongTries, 0);
});

test("6. nextWeek charges fee, fixed costs, phone bill and finishes after week 4", () => {
  const charges = (s) => s.log.map((e) => [e.event, e.cash]);
  const w1 = nextWeek({ ...startGame(), cash: -1005 });
  assert.deepEqual(charges(w1), [["borrowing-fee", -101], ["lunches", -2000], ["transport", -1500]]);
  assert.equal(w1.cash, -1005 - 101 - 3500);
  assert.equal(w1.week, 2);
  assert.equal(w1.day, 8);

  const w2 = nextWeek({ ...startGame(), week: 2, day: 9 });
  assert.deepEqual(charges(w2), [["lunches", -2000], ["transport", -1500], ["phone-bill", -4500]]);
  assert.equal(w2.week, 3);
  assert.equal(w2.day, 15);

  const w4 = nextWeek({ ...startGame(), week: 4, day: 25 });
  assert.deepEqual(charges(w4), [["lunches", -2000], ["transport", -1500]]);
  assert.equal(w4.day, 30);
  assert.equal(w4.week, 4);
  assert.equal(w4.finished, true);
  assert.throws(() => nextWeek(w4), /finished/);
});

test("7. ending covers every rule and boundary", () => {
  const at = (cash, mood = 5, savings = 0) => ending({ ...startGame(), cash, savings, mood });
  assert.equal(at(-1), "broke");
  assert.equal(at(-5000, 5, 4999), "broke");
  assert.equal(at(0), "scraped");
  assert.equal(at(4999), "scraped");
  assert.equal(at(5000), "made-it");
  assert.equal(at(14999), "made-it");
  assert.equal(at(15000), "cushion");
  assert.equal(at(10000, 5, 5000), "cushion", "savings count");
  assert.equal(at(15000, 2), "scraped");
  assert.equal(at(15000, 3), "cushion");
  assert.equal(at(5000, 3), "made-it");
});

test("8. biggestHit and formatMoney", () => {
  let state = startGame();
  state = applyChoice(state, event, 0);
  state = nextWeek(state);
  assert.equal(biggestHit(state).label, "Spend");
  assert.equal(biggestHit(startGame()), null);

  const save = { id: "save", week: 1, day: 2, choices: [{ label: "Save $100", cash: -10000, savings: 10000 }] };
  const saver = nextWeek(applyChoice(startGame(), save, 0));
  assert.equal(biggestHit(saver).label, "Lunches", "a move into savings is not a hit");
  assert.equal(biggestHit(applyChoice(startGame(), save, 0)), null, "only savings moves: no hit");
  assert.equal(formatMoney(41250), "$412.50");
  assert.equal(formatMoney(-12000), "-$120.00");
  assert.equal(formatMoney(0), "$0.00");
  assert.equal(formatMoney(5), "$0.05");
});

test("pickSurprise draws from the week's surprise pool", () => {
  const pool = [{ id: "a", week: 1, surprise: true }, { id: "b", week: 1, surprise: true }, { id: "c", week: 1, surprise: false }];
  assert.equal(pickSurprise(pool, 1, () => 0).id, "a");
  assert.equal(pickSurprise(pool, 1, () => 0.99).id, "b");
  assert.equal(pickSurprise(pool, 1, () => 1).id, "b");
  assert.throws(() => pickSurprise(pool, 2, () => 0), /no surprise/);
});

test("checkLock handles spot and pick", () => {
  const spot = puzzles.find((p) => p.kind === "spot");
  assert.equal(checkLock(spot, spot.answer), true);
  for (const wrong of ["paycheck", "", null, 0]) assert.equal(checkLock(spot, wrong), false);

  const pick = puzzles.find((p) => p.kind === "pick");
  assert.equal(checkLock(pick, [...pick.answer]), true);
  assert.equal(checkLock(pick, [...pick.answer].reverse()), true, "order does not matter");
  const allIds = pick.document.options.map((o) => o.id);
  for (const wrong of [[], [pick.answer[0]], allIds, [pick.answer[0], pick.answer[0]], [...pick.answer, "bike-to-work"], "saturday-shift"]) {
    assert.equal(checkLock(pick, wrong), false, String(wrong));
  }
  const input = [...pick.answer].reverse();
  checkLock(pick, input);
  assert.deepEqual(input, [...pick.answer].reverse(), "input is not mutated");
});
