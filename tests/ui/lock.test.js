// Criteria 2 and 3: every lock kind opens on the right answer, counts wrong tries, shows hints at 2 and 3 and
// "Show me how" at 4; code input parses to cents and bad input is refused without counting a try.
import assert from "node:assert/strict";
import { test } from "node:test";
import { startGame } from "../../public/js/game/engine.js";
import { render, toCents } from "../../public/js/ui/lock.js";
import { installDom } from "./fake-dom.js";
import { gap, payStub, statement } from "./fixtures.js";

const doc = installDom();

test("toCents turns typed amounts into whole cents", () => {
  assert.equal(toCents("98.08"), 9808);
  assert.equal(toCents("$98.08"), 9808);
  assert.equal(toCents("98"), 9800);
  assert.equal(toCents("98.0"), 9800);
  assert.equal(toCents(" $ 621.92 "), 62192);
  assert.equal(toCents("1,000.00"), 100000);
  for (const bad of ["", "abc", "98.084", "-98.08", "$", "9.8.0"]) assert.equal(toCents(bad), null, bad);
});

// Draws a lock and returns helpers to answer it like a player would.
function lock(puzzle, answerWith) {
  const root = doc.createElement("div");
  const done = [];
  render(root, { state: startGame(), puzzle }, (state) => done.push(state));
  const submit = () => root.querySelector("button[type=\"submit\"]").click();
  return {
    root,
    done,
    try: (answer) => {
      answerWith(root, answer);
      submit();
    },
    hints: () => root.querySelectorAll(".lock-hint").map((li) => li.textContent),
    how: () => root.querySelectorAll("button").find((b) => b.textContent === "Show me how"),
    feedback: () => root.querySelector(".lock-feedback"),
  };
}

const KINDS = {
  code: {
    puzzle: payStub,
    right: "98.08",
    wrong: "87.64",
    answer: (root, text) => root.querySelector(".lock-code-input").type(text),
  },
  spot: {
    puzzle: statement,
    right: "streammax",
    wrong: "tacos",
    answer: (root, id) => root.querySelectorAll(".lock-spot-line")[statement.document.lines.findIndex((l) => l.id === id)].click(),
  },
  pick: {
    puzzle: gap,
    right: ["skip-movie", "extra-shift"],
    wrong: ["pack-lunch"],
    answer: (root, ids) => {
      for (const box of root.querySelectorAll(".lock-pick-check")) if (box.checked !== ids.includes(box.value)) box.click();
    },
  },
};

for (const [kind, { puzzle, right, wrong, answer }] of Object.entries(KINDS)) {
  test(`${kind} lock: the right answer opens the door with no wrong tries`, () => {
    const l = lock(puzzle, answer);
    l.try(right);
    assert.equal(l.root.querySelector(".lock-form").localName, "div");
    l.root.querySelector("button").click();
    assert.deepEqual(l.done[0].locks, [{ puzzle: puzzle.id, wrongTries: 0, hintUsed: false }]);
  });

  test(`${kind} lock: wrong tries count up, hints at 2 and 3, "Show me how" at 4`, () => {
    const l = lock(puzzle, answer);
    assert.equal(l.feedback().hidden, true);
    l.try(wrong);
    assert.match(l.feedback().textContent, /1 wrong try so far/);
    assert.deepEqual(l.hints(), []);
    l.try(wrong);
    assert.match(l.feedback().textContent, /2 wrong tries/);
    assert.deepEqual(l.hints(), [`Hint 1${puzzle.hints[0]}`]);
    l.try(wrong);
    assert.deepEqual(l.hints(), [`Hint 1${puzzle.hints[0]}`, `Hint 2${puzzle.hints[1]}`]);
    assert.equal(l.how().hidden, true);
    l.try(wrong);
    assert.equal(l.how().hidden, false);
    l.how().click();
    assert.ok(l.root.textContent.includes(puzzle.explain));
    l.root.querySelectorAll("button").at(-1).click();
    assert.deepEqual(l.done[0].locks, [{ puzzle: puzzle.id, wrongTries: 4, hintUsed: true }]);
  });
}

test("code lock refuses input that is not an amount, without counting a wrong try", () => {
  const l = lock(payStub, KINDS.code.answer);
  for (const bad of ["abc", "", "98.084"]) {
    l.try(bad);
    assert.match(l.feedback().textContent, /like 12\.34/);
    assert.equal(l.root.querySelector(".lock-code-input").getAttribute("aria-invalid"), "true");
  }
  l.try("$98.08");
  l.root.querySelector("button").click();
  assert.equal(l.done[0].locks[0].wrongTries, 0);
});

test("spot and pick locks ask for an answer before trying, without counting a wrong try", () => {
  for (const puzzle of [statement, gap]) {
    const l = lock(puzzle, () => {});
    l.try();
    assert.ok(!l.feedback().hidden);
    assert.doesNotMatch(l.feedback().textContent, /wrong/);
  }
});
