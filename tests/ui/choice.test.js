// Criterion 6 and the carried review note: an unavailable choice stays focusable, is aria-disabled with its reason
// linked, cannot be chosen, and only money requirements are written as money.
import assert from "node:assert/strict";
import { test } from "node:test";
import { render, unmetReason } from "../../public/js/ui/choice.js";
import { installDom } from "./fake-dom.js";
import { brokenPhone, week2 } from "./fixtures.js";

const doc = installDom();

test("an unmet choice is focusable, aria-disabled, linked to its reason, and does nothing", () => {
  const root = doc.createElement("div");
  const picked = [];
  render(root, { state: week2, event: brokenPhone }, (i) => picked.push(i));
  const buttons = root.querySelectorAll(".choice-option");
  const savings = buttons[2];
  assert.equal(savings.hasAttribute("disabled"), false);
  assert.equal(savings.getAttribute("aria-disabled"), "true");
  const reason = root.querySelector(`#${savings.getAttribute("aria-describedby")}`);
  assert.equal(reason.textContent, "You have $60.00 saved. This needs $120.00.");
  assert.equal(root.querySelectorAll(".choice-option-reason").length, 1);
  savings.click();
  assert.deepEqual(picked, []);
  assert.equal(buttons[0].hasAttribute("aria-disabled"), false);
  buttons[0].click();
  buttons[1].click();
  assert.deepEqual(picked, [0]);
});

test("prices carry their sign; a zero price has none", () => {
  const root = doc.createElement("div");
  render(root, { state: week2, event: brokenPhone }, () => {});
  const prices = root.querySelectorAll(".choice-option-price");
  assert.deepEqual(prices.map((p) => p.textContent), ["-$120.00", "$0.00", "-$120.00"]);
  assert.deepEqual(prices.map((p) => p.className), ["choice-option-price money money-out", "choice-option-price money", "choice-option-price money money-out"]);
});

test("only money requirements are formatted as money", () => {
  assert.equal(unmetReason({ cash: 500 }, { requires: { cash: 1000 } }), "You have $5.00 cash. This needs $10.00.");
  assert.equal(unmetReason({ mood: 2 }, { requires: { mood: 5 } }), "Your mood is 2. This needs 5.");
  assert.equal(unmetReason({ savings: 9000 }, { requires: { savings: 8500 } }), null);
});
