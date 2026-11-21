import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { puzzles } from "../../public/js/content/puzzles.js";
import { pickSurprise } from "../../public/js/game/engine.js";

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const weekDays = { 1: [1, 7], 2: [8, 14], 3: [15, 21], 4: [22, 30] };

test("ids are unique and kebab-case; days, amounts, labels and results are valid", () => {
  const ids = [...events, ...puzzles].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const id of ids) assert.match(id, kebab);
  for (const e of events) {
    const [from, to] = weekDays[e.week];
    assert.ok(e.day >= from && e.day <= to, `${e.id} day ${e.day} is in week ${e.week}`);
    assert.ok(e.title && e.body, e.id);
    for (const c of e.choices) {
      assert.ok(c.label.trim() && c.result.trim(), `${e.id}: ${c.label}`);
      for (const cents of [c.cash, c.savings, ...Object.values(c.requires ?? {})].filter((v) => v !== undefined)) {
        assert.ok(Number.isInteger(cents) && Math.abs(cents) >= 500 && Math.abs(cents) <= 25000, `${e.id}: ${cents}`);
      }
      if (c.savings < 0) assert.ok(c.requires?.savings >= -c.savings, `${e.id}: spending savings needs requires`);
    }
  }
});

test("each week has two or three fixed events and at least three surprises; pickSurprise stays in the week", () => {
  for (const week of [1, 2, 3, 4]) {
    const fixed = events.filter((e) => e.week === week && !e.surprise);
    const pool = events.filter((e) => e.week === week && e.surprise);
    assert.ok(fixed.length >= 2 && fixed.length <= 3, `week ${week} fixed`);
    assert.ok(pool.length >= 3, `week ${week} pool`);
    assert.equal(pickSurprise(events, week, () => 0), pool[0]);
    assert.equal(pickSurprise(events, week, () => 0.999), pool.at(-1));
    for (let r = 0; r < 1; r += 0.05) assert.ok(pool.includes(pickSurprise(events, week, () => r)));
  }
  assert.ok(events.some((e) => e.id === "concert" && e.week === 1 && e.surprise));
});

test("each puzzle has every field, two hints and one per week", () => {
  assert.deepEqual(puzzles.map((p) => p.week), [1, 2, 3, 4]);
  for (const p of puzzles) {
    assert.ok(["code", "spot", "pick"].includes(p.kind), p.id);
    assert.ok(p.prompt && p.document && p.answer !== undefined && p.explain, p.id);
    assert.equal(p.hints.length, 2, p.id);
    for (const h of p.hints) assert.ok(h.trim(), p.id);
  }
});

test("pay-stub answer is the sum of the deductions on its stub", () => {
  const stub = puzzles.find((p) => p.id === "pay-stub");
  const deductions = stub.document.lines.filter((l) => l.amount < 0).reduce((sum, l) => sum - l.amount, 0);
  assert.equal(deductions, stub.answer);
  assert.equal(stub.document.lines.reduce((sum, l) => sum + l.amount, 0), 62192, "take-home matches the starting cash");
});

test("find-the-fee answer is a line on the statement", () => {
  const p = puzzles.find((x) => x.kind === "spot");
  const lines = p.document.lines;
  assert.ok(lines.length >= 7 && lines.length <= 9);
  assert.equal(new Set(lines.map((l) => l.id)).size, lines.length);
  for (const l of lines) assert.ok(kebab.test(l.id) && l.date && l.description && Number.isInteger(l.amount));
  assert.ok(lines.find((l) => l.id === p.answer).amount < 0);
});

test("true-cost answer is the plan total minus the pay-today price", () => {
  const p = puzzles.find((x) => x.id === "true-cost");
  const [now, plan] = p.document.options.map((o) => o.lines.reduce((sum, l) => sum + l.amount, 0));
  assert.equal(p.document.options[1].lines.filter((l) => l.label.startsWith("Payment")).length, 4);
  assert.equal(plan - now, p.answer);
});

test("close-the-gap answer is the one set that closes the gap for the least mood", () => {
  const p = puzzles.find((x) => x.kind === "pick");
  const { options, shortfall } = p.document;
  assert.ok(options.length >= 5 && options.length <= 7);
  const closing = [];
  for (let mask = 1; mask < 1 << options.length; mask++) {
    const set = options.filter((_, i) => mask & (1 << i));
    if (set.reduce((sum, o) => sum + o.amount, 0) >= shortfall) {
      closing.push({ ids: set.map((o) => o.id).sort(), moodLost: -set.reduce((sum, o) => sum + o.mood, 0) });
    }
  }
  const least = Math.min(...closing.map((s) => s.moodLost));
  const best = closing.filter((s) => s.moodLost === least);
  assert.equal(best.length, 1, "the answer is unique");
  assert.deepEqual(p.answer, best[0].ids);
});
