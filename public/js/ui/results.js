import { events } from "../content/events.js";
import { biggestHit, ending, formatMoney } from "../game/engine.js";
import { changeClass, cls, h, moodWord, show, signed } from "./dom.js";

const ENDINGS = {
  broke: ["You ran out.", "Borrowing covered the gap, and the fees came out of what was left."],
  scraped: ["You scraped by.", "Close one."],
  "made-it": ["You made it.", "A little left over for next month."],
  cushion: ["You made it with room to spare.", "That's a real cushion."],
};

const moneyClass = (cents) => cls("money", cents < 0 && "money-negative");

// The receipt rows: one heading per week, then every log entry with its cash change and the running cash.
function receiptRows(state) {
  let balance = state.cash - state.log.reduce((sum, entry) => sum + entry.cash, 0);
  const row = (label, change, balanceNow, rowClass) =>
    h(
      "tr",
      { class: rowClass },
      h("th", { scope: "row" }, label),
      h("td", { class: cls("doc-amount money", changeClass(change)) }, signed(change)),
      h("td", { class: cls("results-receipt-balance", moneyClass(balanceNow)) }, formatMoney(balanceNow)),
    );
  const rows = [];
  for (let week = 1; week <= 4; week++) {
    rows.push(h("tr", { class: "results-receipt-week" }, h("th", { colspan: "3", scope: "rowgroup" }, `Week ${week}`)));
    if (week === 1) rows.push(row("Paycheck cashed", balance, balance));
    for (const entry of state.log.filter((e) => e.week === week)) {
      const fee = entry.event === "borrowing-fee";
      const label = fee ? `Borrowing fee, 10% of ${formatMoney(-balance)}` : entry.label;
      balance += entry.cash;
      rows.push(row(label, entry.cash, balance, fee ? "results-receipt-fee" : null));
    }
  }
  return rows;
}

const whenOf = (entry) => {
  const day = events.find((event) => event.id === entry.event)?.day;
  return day ? `day ${day}` : `week ${entry.week}`;
};

// props: { state } at the end of day 30. onDone() when the player moves on to the quiz.
export function render(root, { state }, onDone) {
  const result = ending(state);
  const [title, text] = ENDINGS[result];
  const total = state.cash + state.savings;
  const hit = biggestHit(state);
  const foot = (label, cell) => h("tr", {}, h("th", { scope: "row" }, label), cell);

  show(
    root,
    h(
      "main",
      { class: "page results" },
      h("header", { class: "results-header" }, h("p", { class: "eyebrow" }, "Day 30 of 30"), h("h1", {}, "That's the month.")),
      h(
        "div",
        { class: "results-top" },
        h(
          "section",
          { class: "results-ending", "data-ending": result, "aria-labelledby": "results-ending-title" },
          h("h2", { class: "results-ending-title", id: "results-ending-title" }, title),
          h(
            "p",
            { class: "results-ending-text" },
            "You reached day 30 with ",
            h("span", { class: moneyClass(total) }, formatMoney(total)),
            ` between cash and savings. ${text}`,
          ),
        ),
        h(
          "section",
          { class: "results-hit", "aria-labelledby": "results-hit-label" },
          h("h2", { class: "results-hit-label", id: "results-hit-label" }, "Biggest hit"),
          h("p", { class: "results-hit-what" }, hit ? `${hit.label}, ${whenOf(hit)}` : "Nothing cost you cash this month."),
          hit && h("p", { class: "results-hit-amount money money-out" }, formatMoney(hit.cash)),
        ),
      ),
      h(
        "article",
        { class: "results-receipt doc doc-receipt", "aria-labelledby": "results-receipt-title" },
        h(
          "div",
          { class: "results-receipt-head" },
          h("h2", { class: "doc-title", id: "results-receipt-title" }, "Your month"),
          h("p", { class: "doc-meta" }, "Days 1 to 30 · Blend Street Smoothies paycheck"),
        ),
        h(
          "table",
          { class: "doc-table" },
          h(
            "thead",
            {},
            h(
              "tr",
              {},
              h("th", { scope: "col" }, "Item"),
              h("th", { scope: "col", class: "doc-amount" }, "Change"),
              h("th", { scope: "col", class: "results-receipt-balance" }, "Cash"),
            ),
          ),
          h("tbody", {}, receiptRows(state)),
          h(
            "tfoot",
            {},
            foot("Cash", h("td", { colspan: "2", class: cls("doc-amount", moneyClass(state.cash)) }, formatMoney(state.cash))),
            foot("Savings", h("td", { colspan: "2", class: "doc-amount money" }, formatMoney(state.savings))),
            foot("Left over", h("td", { colspan: "2", class: cls("doc-amount", moneyClass(total)) }, formatMoney(total))),
            foot("Mood", h("td", { colspan: "2", class: "doc-amount" }, `${moodWord(state.mood)}, ${state.mood} of 10`)),
          ),
        ),
        h("p", { class: "results-receipt-foot" }, "Thanks for shopping your month."),
      ),
      h("button", { class: "button button-block", type: "button", onclick: () => onDone() }, "Finish with 6 questions"),
    ),
  );
}
