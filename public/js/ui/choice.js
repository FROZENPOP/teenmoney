import { applyChoice, formatMoney } from "../game/engine.js";
import { h, meters, show, signed } from "./dom.js";

const price = (choice) =>
  [choice.cash && signed(choice.cash), choice.savings && `${signed(choice.savings)} savings`].filter(Boolean).join(", ") ||
  "$0.00";

// props: { state, event }. Shows the event, then the result of the pick. onDone(stateAfterChoice).
export function render(root, { state, event }, onDone) {
  const pick = (i) => {
    const next = applyChoice(state, event, i);
    show(
      root,
      h("h1", {}, event.title),
      h("p", {}, event.choices[i].result),
      meters(next),
      h("button", { type: "button", onclick: () => onDone(next) }, "Keep going"),
    );
  };
  const choices = event.choices.map((choice, i) => {
    const unmet = Object.entries(choice.requires ?? {}).find(([meter, needed]) => state[meter] < needed);
    const reason = unmet && `You need ${formatMoney(unmet[1])} in ${unmet[0]}.`;
    return h(
      "li",
      {},
      h("button", { type: "button", disabled: Boolean(unmet), onclick: () => pick(i) }, `${choice.label} ${price(choice)}`),
      reason && ` ${reason}`,
    );
  });
  show(
    root,
    h("p", {}, `Week ${state.week} of 4, day ${event.day}`),
    meters(state),
    h("h1", {}, event.title),
    h("p", {}, event.body),
    h("ul", {}, choices),
  );
}
