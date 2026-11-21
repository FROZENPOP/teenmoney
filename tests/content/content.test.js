import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { puzzles } from "../../public/js/content/puzzles.js";

test("room 1 has two choice events and the concert surprise, all playable", () => {
  const week1 = events.filter((e) => e.week === 1);
  assert.equal(week1.filter((e) => !e.surprise).length, 2);
  assert.deepEqual(week1.filter((e) => e.surprise).map((e) => e.id), ["concert"]);
  for (const e of week1) {
    assert.ok(e.day >= 1 && e.day <= 7);
    for (const c of e.choices) assert.ok(c.label && c.result);
  }
});

test("pay-stub answer is the sum of the deductions on its stub", () => {
  const stub = puzzles.find((p) => p.id === "pay-stub");
  const deductions = stub.document.lines.filter((l) => l.amount < 0).reduce((sum, l) => sum - l.amount, 0);
  assert.equal(stub.answer, 9808);
  assert.equal(deductions, stub.answer);
  assert.equal(stub.document.lines.reduce((sum, l) => sum + l.amount, 0), 62192, "take-home matches the starting cash");
});
