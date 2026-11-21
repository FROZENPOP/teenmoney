// Criterion 1: each screen, given its mockup's example content, draws the mockup's element structure and classes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { startGame } from "../../public/js/game/engine.js";
import { questions } from "../../public/js/quiz/quiz.js";
import { installDom, parseMockup, tree } from "./fake-dom.js";
import { brokenPhone, gap, payStub, statement, week2 } from "./fixtures.js";

const doc = installDom();
const ui = async (name) => import(`../../public/js/ui/${name}.js`);
const draw = async (name, props, onDone = () => {}) => {
  const root = doc.createElement("div");
  (await ui(name)).render(root, props, onDone);
  return root;
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const matchesMockup = (root, mockup, expected = parseMockup(mockup)) => assert.deepEqual(tree(root.children[0]), expected);

const question = (text) => ({ id: text, text, options: ["a", "b", "c", "d"], correct: 1, explain: `${text} explained.` });
const sixQuestions = [1, 2, 3, 4, 5, 6].map((n) => question(`Question ${n}`));

test("quiz matches quiz.html on question 2 of 6", async () => {
  const root = await draw("quiz", { questions: sixQuestions, eyebrow: "Six questions before you play" });
  root.querySelector("input").click();
  root.querySelector("button").click();
  assert.equal(root.querySelector(".quiz-progress-text").textContent, "2 of 6");
  root.querySelectorAll("input")[1].click();
  matchesMockup(root, "quiz");
});

test("payday matches payday.html", async () => {
  const root = await draw("payday", { state: startGame() });
  matchesMockup(root, "payday");
  assert.equal(root.querySelector(".payday-check-words").textContent, "Six hundred twenty-one and 92/100 dollars");
  assert.equal(root.querySelector(".payday-check-amount").textContent, "$621.92");
});

test("choice matches choice.html, with the savings choice unavailable", async () => {
  matchesMockup(await draw("choice", { state: week2, event: brokenPhone }), "choice");
});

test("choice result matches choice-result.html", async () => {
  const state = { ...week2, cash: 29250, mood: 6 };
  const root = await draw("choice-result", { state, prev: week2, event: brokenPhone, choiceIndex: 0 });
  matchesMockup(root, "choice-result");
  assert.deepEqual(
    root.querySelectorAll(".meter-change").map((el) => el.textContent),
    ["-$120.00", "no change", "+1"],
  );
});

test("code lock matches lock-code.html after two wrong tries", async () => {
  const root = await draw("lock", { state: startGame(), puzzle: payStub });
  for (let i = 0; i < 2; i++) {
    root.querySelector("input").type("87.64");
    root.querySelector("button[type=\"submit\"]").click();
  }
  matchesMockup(root, "lock-code");
});

// The lock feedback region stays in the page (empty) before the first try, so screen readers hear every change.
// The spot and pick mockups show no try yet, so they lack it; it sits just before .lock-actions as in lock-code.html.
function withFeedbackRegion(expected) {
  const form = expected[2];
  form.splice(form.length - 1, 0, ["div.lock-feedback"]);
  return expected;
}

test("spot lock matches lock-spot.html with one line marked", async () => {
  const root = await draw("lock", { state: startGame(), puzzle: statement });
  root.querySelectorAll(".lock-spot-line")[1].click();
  root.querySelectorAll(".lock-spot-line")[5].click();
  // The mockup's lines are all charges; this statement starts with the paycheck, so its first amount is money-in.
  const expected = parseMockup("lock-spot");
  expected[2][1][3][2][1][1][3] = ["span.money.money-in"];
  withFeedbackRegion(expected);
  matchesMockup(root, "lock-spot", expected);
  assert.equal(root.querySelectorAll(".lock-spot-mark").length, 1);
  assert.deepEqual(
    root.querySelectorAll(".lock-spot-line").map((b) => b.getAttribute("aria-pressed")),
    ["false", "false", "false", "false", "false", "true", "false", "false"],
  );
  assert.equal(root.querySelector(".lock-spot-choice").textContent, "You marked: STREAMMAX PREMIUM AUTO-RENEW, -$14.99");
});

test("pick lock matches lock-pick.html with two picks and keeps the tally", async () => {
  const root = await draw("lock", { state: startGame(), puzzle: gap });
  const boxes = root.querySelectorAll(".lock-pick-check");
  boxes[0].click();
  boxes[3].click();
  matchesMockup(root, "lock-pick", withFeedbackRegion(parseMockup("lock-pick")));
  const cells = root.querySelectorAll(".doc-amount").map((td) => td.textContent);
  assert.deepEqual(cells, ["-$85.00", "+$80.00", "-$5.00"]);
  assert.equal(root.querySelector(".lock-pick-status").textContent, "Still $5.00 short.");
  boxes[2].click();
  assert.equal(root.querySelectorAll(".doc-amount")[2].textContent, "+$30.00");
});

// The mockup's month: four weeks of rows, a borrowing fee in week 4, ending "scraped".
const entry = (week, label, cash, extra = {}) => ({ week, event: "x", choice: 0, label, cash, savings: 0, mood: 0, ...extra });
const fixed = (week, label, cash, event) => ({ ...entry(week, label, cash), event, choice: null });
const monthLog = [
  entry(1, "Moved to savings", -6000, { savings: 6000 }),
  entry(1, "Concert with friends", -6500),
  fixed(1, "Lunches", -2000, "lunches"),
  fixed(1, "Transport", -1500, "transport"),
  entry(2, "Phone screen fixed", -12000),
  fixed(2, "Lunches", -2000, "lunches"),
  fixed(2, "Transport", -1500, "transport"),
  fixed(2, "Phone bill", -4500, "phone-bill"),
  entry(3, "Sneakers on sale", -9500),
  entry(3, "Earbuds, pay later (1 of 4)", -3000),
  fixed(3, "Lunches", -2000, "lunches"),
  fixed(3, "Transport", -1500, "transport"),
  entry(4, "Group gift", -4000),
  entry(4, "Earbuds, pay later (2 of 4)", -3000),
  entry(4, "Bike tire repair", -4800),
  fixed(4, "Borrowing fee", -161, "borrowing-fee"),
  fixed(4, "Lunches", -2000, "lunches"),
  fixed(4, "Transport", -1500, "transport"),
];

test("results matches results.html and keeps a running cash balance", async () => {
  const state = { ...startGame(), day: 30, week: 4, cash: -5269, savings: 6000, mood: 4, log: monthLog, finished: true };
  const root = await draw("results", { state });
  matchesMockup(root, "results");
  assert.equal(root.querySelector(".results-ending").getAttribute("data-ending"), "scraped");
  assert.equal(root.querySelector(".results-hit-amount").textContent, "-$120.00");
  assert.equal(root.querySelector(".results-receipt-fee").textContent, "Borrowing fee, 10% of $16.08-$1.61-$17.69");
  const balances = root.querySelectorAll(".results-receipt-balance").map((td) => td.textContent);
  assert.equal(balances[1], "$621.92");
  assert.equal(balances.at(-1), "-$52.69");
});

test("reading matches reading.html", async () => {
  const reading = { title: "Your first paycheck", paragraphs: ["1", "2", "3", "4", "5", "6", "7"] };
  matchesMockup(await draw("reading", { reading }), "reading");
});

test("thanks matches thanks.html in the could-not-save state, with each answer's explain added", async () => {
  const root = await draw("thanks", {
    questions,
    quizBefore: questions.map((q, i) => (i < 3 ? q.correct : (q.correct + 1) % 4)),
    quizAfter: questions.map((q, i) => (i === 4 ? (q.correct + 1) % 4 : q.correct)),
    save: async () => ({ ok: false, error: "could not save" }),
  });
  await tick();
  // The mockup has no explain line. The brief asks for it, so each answer gets one more plain <p> after the right answer.
  const expected = parseMockup("thanks");
  const answers = expected[4][2];
  for (const answer of answers.slice(1)) answer.splice(3, 0, ["p"]);
  // No "Play again" in the study build (ARCHITECTURE.md 3.4).
  assert.equal(expected.pop()[0], "div.thanks-actions");
  matchesMockup(root, "thanks", expected);
  assert.equal(root.querySelector(".thanks-save").getAttribute("data-state"), "error");
  assert.equal(root.querySelectorAll("button").map((b) => b.textContent).join(), "Try again");
  assert.equal(root.querySelector(".thanks-score-change").textContent, "+2 right");
  assert.equal(root.querySelectorAll(".thanks-answer")[0].children[2].textContent, questions[0].explain);
});

test("thanks keeps one status region, says a 429 in plain words, and Try again retries", async () => {
  const results = [{ ok: false, error: "too many requests" }, { ok: true }];
  const root = await draw("thanks", {
    questions,
    quizBefore: questions.map(() => 0),
    quizAfter: questions.map(() => 0),
    save: async () => results.shift(),
  });
  await tick();
  const status = root.querySelector(".thanks-save");
  assert.equal(status.getAttribute("role"), "status");
  assert.equal(status.getAttribute("data-state"), "error");
  assert.match(status.textContent, /Too many people saved from this network at once\. Wait a minute, then try again\./);
  status.querySelector("button").click();
  await tick();
  assert.equal(root.querySelector(".thanks-save"), status, "the region is changed in place, not replaced");
  assert.equal(status.getAttribute("data-state"), "saved");
  assert.equal(status.querySelector("button").hidden, true);
});

test("finished screen uses the thanks markup and offers a new student", async () => {
  let done = 0;
  const root = await draw("finished", {}, () => done++);
  assert.deepEqual(tree(root.children[0]).map((n) => (Array.isArray(n) ? n[0] : n)), ["main.page.thanks", "header", "section.thanks-save", "div.thanks-actions"]);
  root.querySelector("button").click();
  assert.equal(done, 1);
});

test("choice result focuses the consequence line, not the button", async () => {
  const root = await draw("choice-result", { state: { ...week2, cash: 29250, mood: 6 }, prev: week2, event: brokenPhone, choiceIndex: 0 });
  assert.equal(doc.activeElement, root.querySelector(".choice-result-line"));
  assert.equal(doc.activeElement.getAttribute("tabindex"), "-1");
});
