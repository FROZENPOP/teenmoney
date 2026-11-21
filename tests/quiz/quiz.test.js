import assert from "node:assert/strict";
import { test } from "node:test";
import { questions, score } from "../../public/js/quiz/quiz.js";
import { reading } from "../../public/js/quiz/reading.js";

const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

test("1. six questions with unique kebab-case ids, four options, one correct index and an explanation", () => {
  assert.equal(questions.length, 6);
  assert.equal(new Set(questions.map((q) => q.id)).size, 6);
  for (const q of questions) {
    assert.match(q.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(nonEmpty(q.text), q.id);
    assert.equal(q.options.length, 4, q.id);
    assert.ok(q.options.every(nonEmpty), q.id);
    assert.equal(new Set(q.options).size, 4, `${q.id} options differ`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, q.id);
    assert.ok(nonEmpty(q.explain), q.id);
    assert.doesNotMatch(q.options.join(" "), /all of the above|none of the above/i, q.id);
  }
  assert.ok(new Set(questions.map((q) => q.correct)).size > 1, "the right answer is not always in the same place");
  assert.deepEqual(questions.map((q) => q.id), ["net-pay", "needs-wants", "spot-charge", "emergency-fund", "pay-later", "income-drop"]);
});

test("2. score counts exact matches only, from 0 to 6", () => {
  const right = questions.map((q) => q.correct);
  assert.equal(score(right), 6);
  assert.equal(score(right.map((c) => (c + 1) % 4)), 0);
  assert.equal(score([right[0], right[1], 9, 9, 9, 9]), 2);
  assert.equal(score(right.map(String)), 0, "\"1\" is not 1");
  assert.equal(score([]), 0);
  assert.equal(score([...right, 0, 0]), 6);
});

test("3. reading: a title and 500 to 700 words of plain text", () => {
  assert.ok(nonEmpty(reading.title));
  assert.ok(reading.paragraphs.length > 0 && reading.paragraphs.every(nonEmpty));
  const words = reading.paragraphs.join(" ").trim().split(/\s+/).length;
  assert.ok(words >= 500 && words <= 700, `${words} words`);
  assert.doesNotMatch(reading.paragraphs.join(" "), /<[a-z/]/i, "no markup");
});

test("3. the reading does not quote any question or option", () => {
  const text = reading.paragraphs.join(" ").toLowerCase();
  for (const q of questions) {
    assert.ok(!text.includes(q.text.toLowerCase()), q.id);
    for (const option of q.options) {
      if (option.length > 12) assert.ok(!text.includes(option.toLowerCase()), `${q.id}: "${option}"`);
    }
  }
});
