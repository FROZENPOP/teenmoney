import { biggestHit, ending, formatMoney } from "../game/engine.js";
import { h, show, signed } from "./dom.js";

const ENDINGS = {
  broke: "You ran out of money and had to borrow.",
  scraped: "You scraped through.",
  "made-it": "You made it, with a little left over.",
  cushion: "You made it with a real cushion.",
};

// props: { state }. onDone() when the player moves on to the quiz.
export function render(root, { state }, onDone) {
  const hit = biggestHit(state);
  show(
    root,
    h("h1", {}, "Your month"),
    h(
      "ol",
      {},
      state.log.map((entry) =>
        h("li", {}, `Week ${entry.week}: ${entry.label} ${signed(entry.cash)}${entry.savings ? `, ${signed(entry.savings)} savings` : ""}`),
      ),
    ),
    h("p", {}, `Cash ${formatMoney(state.cash)}, savings ${formatMoney(state.savings)}.`),
    h("p", {}, ENDINGS[ending(state)]),
    h("p", {}, hit ? `Biggest hit: ${hit.label} ${formatMoney(hit.cash)}` : "No big hits this month."),
    h("button", { type: "button", onclick: () => onDone() }, "Finish with 6 questions"),
  );
}
