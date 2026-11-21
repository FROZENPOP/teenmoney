import { formatMoney } from "../game/engine.js";
import { after, countTo, h, ms, show } from "./dom.js";

const ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split(" ");

// 621 -> "six hundred twenty-one". Whole dollars 0 to 9999, enough for any paycheck in this game.
export function dollarsInWords(n) {
  if (n >= 1000) return `${dollarsInWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${dollarsInWords(n % 1000)}` : ""}`;
  if (n >= 100) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${dollarsInWords(n % 100)}` : ""}`;
  if (n >= 20) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;
  return ONES[n];
}

const SIGNATURE =
  "M6 32c10-20 20-26 22-14s-6 20 2 12 12-20 18-14-4 18 4 14 10-14 16-10 2 12 10 8 8-10 14-8 4 8 10 6 12-8 20-8 14 4 24 2 18-6 30-6";

// props: { state }. The typed name stays on this screen; it is never saved. onDone() on "Start week 1".
export function render(root, { state }, onDone) {
  const dollars = Math.floor(state.cash / 100);
  const cents = String(state.cash % 100).padStart(2, "0");
  const words = dollarsInWords(dollars);

  const name = h("input", {
    class: "payday-check-name",
    id: "payday-name",
    name: "name",
    type: "text",
    autocomplete: "off",
    maxlength: "24",
    "aria-describedby": "payday-name-hint payday-name-error",
    oninput: () => {
      error.hidden = true;
      name.removeAttribute("aria-invalid");
    },
  });
  const error = h("p", { class: "field-error", id: "payday-name-error", hidden: true }, "Write a name on the line first.");
  const check = h(
    "article",
    { class: "payday-check doc doc-check", "aria-label": "Paycheck" },
    h("p", { class: "payday-check-payer" }, h("strong", {}, "Blend Street Smoothies"), h("span", {}, "Shift pay · Weeks 1 to 4")),
    h("p", { class: "payday-check-meta" }, "No. 0001", h("br"), "Day 1"),
    h(
      "div",
      { class: "payday-check-payee" },
      h("label", { class: "payday-check-label", for: "payday-name" }, "Pay to the order of"),
      name,
      h("p", { class: "payday-check-name-hint", id: "payday-name-hint" }, "Your first name. It stays on this device."),
      error,
    ),
    h(
      "p",
      { class: "payday-check-amount money", "aria-label": `${dollars} dollars and ${Number(cents)} cents` },
      h("span", { class: "payday-check-amount-sign" }, "$"),
      formatMoney(state.cash).slice(1),
    ),
    h("p", { class: "payday-check-words" }, `${words[0].toUpperCase()}${words.slice(1)} and ${cents}/100 dollars`),
    h("p", { class: "payday-check-memo" }, h("span", {}, "Memo"), "Make it last 30 days"),
    h(
      "p",
      { class: "payday-check-sign" },
      h(
        "svg:svg",
        { viewBox: "0 0 220 44", fill: "none", "aria-hidden": "true" },
        h("svg:path", { d: SIGNATURE, stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      ),
      h("span", {}, "Shift manager"),
    ),
    h("p", { class: "payday-check-micr", "aria-hidden": "true" }, "|:0612440|: 0001"),
  );

  const cashValue = h("dd", { class: "meter-value" }, formatMoney(state.cash));
  const cashMeter = h(
    "div",
    { class: "meter meter-cash" },
    h("dt", { class: "meter-label" }, "Your cash"),
    cashValue,
    h("dd", { class: "meter-change money-in" }, `+${formatMoney(state.cash)}`),
  );

  const tear = h("button", { class: "button button-block", type: "button", onclick: () => cash() }, "Cash this check");
  const start = h("button", { class: "button button-block", type: "button", hidden: true, onclick: () => onDone() }, "Start week 1");

  const main = h(
    "main",
    { class: "page page-wide payday" },
    h(
      "header",
      { class: "payday-header" },
      h("p", { class: "eyebrow" }, "Day 1 of 30 · Payday"),
      h("h1", {}, "Your first paycheck."),
      h("p", { class: "lede" }, "Four weeks of smoothie shifts, on one piece of paper. Make it last until day 30."),
    ),
    h(
      "div",
      { class: "payday-paper" },
      h(
        "div",
        { class: "payday-slot" },
        check,
        h(
          "div",
          { class: "payday-cashed", role: "status" },
          h("p", { class: "payday-cashed-title" }, "Cashed."),
          h("dl", { class: "meters payday-cashed-meters" }, cashMeter),
          h("p", {}, "Keep the stub. You'll need it to get out of week 1."),
        ),
      ),
      h(
        "section",
        { class: "payday-stub doc doc-stub", "aria-labelledby": "payday-stub-title" },
        h(
          "div",
          { class: "payday-stub-head" },
          h("h2", { class: "doc-title", id: "payday-stub-title" }, "Pay stub"),
          h("p", { class: "payday-stub-keep" }, "Keep this part"),
        ),
        h(
          "table",
          { class: "doc-table" },
          h(
            "tbody",
            {},
            [
              ["Hours worked", "60"],
              ["Pay per hour", "$12.00"],
              ["Gross pay", "$720.00"],
            ].map(([label, amount]) => h("tr", {}, h("th", { scope: "row" }, label), h("td", { class: "doc-amount money" }, amount))),
            h("tr", {}, h("th", { scope: "row" }, "Taxes taken out"), h("td", { class: "doc-amount" }, "3 kinds")),
          ),
        ),
      ),
    ),
    h("div", { class: "payday-actions" }, tear, start),
  );

  const cash = () => {
    if (!name.value.trim()) {
      error.hidden = false;
      name.setAttribute("aria-invalid", "true");
      name.focus();
      return;
    }
    check.classList.add("is-torn");
    tear.disabled = true;
    after(ms("--duration-tear"), () => {
      main.classList.add("is-cashed");
      tear.hidden = true;
      start.hidden = false;
      start.focus();
      cashMeter.classList.add("is-up");
      countTo(cashValue, 0, state.cash);
    });
  };

  show(root, main);
}
