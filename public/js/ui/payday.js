import { formatMoney } from "../game/engine.js";
import { h, show } from "./dom.js";

// props: { state }. The typed name stays on this screen; it is never saved.
export function render(root, { state }, onDone) {
  const form = h(
    "form",
    {
      onsubmit: (e) => {
        e.preventDefault();
        onDone();
      },
    },
    h("p", {}, h("label", { for: "payday-name" }, "Pay to "), h("input", { id: "payday-name", autocomplete: "off" })),
    h("p", {}, `Amount: ${formatMoney(state.cash)}`),
    h("p", {}, "Smoothie shop, 60 hours at $12.00."),
    h("button", { type: "submit" }, "Cash this check"),
  );
  show(root, h("h1", {}, "Payday"), h("p", {}, "Your first paycheck. Make it last 30 days."), form);
}
