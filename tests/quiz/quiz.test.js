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
  const count = reading.paragraphs.join(" ").trim().split(/\s+/).length;
  assert.ok(count >= 500 && count <= 700, `${count} words`);
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

const words = (text) => text.toLowerCase().replace(/[^a-z0-9$]+/g, " ").trim().split(" ");
const STOP = new Set("a an and the or of to for in on at is it so you your be are not if that this as with by".split(" "));

test("3. the reading shares no three-word run with any option", () => {
  const text = ` ${words(reading.paragraphs.join(" ")).join(" ")} `;
  const found = [];
  for (const q of questions) {
    for (const source of q.options) {
      const w = words(source);
      for (let i = 0; i + 3 <= w.length; i++) {
        const run = w.slice(i, i + 3);
        if (run.every((x) => STOP.has(x))) continue;
        if (text.includes(` ${run.join(" ")} `)) found.push(`${q.id}: "${run.join(" ")}"`);
      }
    }
  }
  assert.deepEqual(found, [], "three-word runs from the quiz found in the reading");
});

// The key idea of every option, right or wrong. The paragraph that teaches a question's topic must not
// name these, so a reader has to understand the idea instead of matching words.
const echoes = {
  "net-pay": ["$500", "$420", "$580", "$80"],
  "needs-wants": ["sneaker", "streaming", "concert", "bus pass"],
  "spot-charge": ["bank or", "company", "ignore", "small amount", "few months", "close"],
  "emergency-fund": ["sale", "trip", "car", "repair", "normal bill", "regular bill", "phone"],
  "pay-later": ["color", "friend", "late fee", "add up to more", "cheaper"],
  "income-drop": ["keep spending", "hope", "borrow", "skip", "wants first", "keep paying"],
};

test("3. each topic paragraph avoids the words of that question's options", () => {
  assert.deepEqual(Object.keys(echoes), questions.map((q) => q.id));
  const found = [];
  questions.forEach((q, i) => {
    const paragraph = ` ${words(reading.paragraphs[i + 1]).join(" ")} `;
    for (const echo of echoes[q.id]) {
      if (paragraph.includes(` ${words(echo).join(" ")}`)) found.push(`paragraph ${i + 2} (${q.id}): "${echo}"`);
    }
  });
  assert.deepEqual(found, []);
});
