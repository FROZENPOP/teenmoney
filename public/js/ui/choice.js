import { formatMoney } from "../game/engine.js";
import { changeClass, cls, h, meters, show, signed } from "./dom.js";

// Money fields a choice can require, and how the reason names them.
const MONEY_FIELDS = { cash: "cash", savings: "saved" };

// Why a choice can't be picked, or null when every `requires` is met. Only money fields are formatted as money.
export function unmetReason(state, choice) {
  const unmet = Object.entries(choice.requires ?? {}).find(([field, needed]) => state[field] < needed);
  if (!unmet) return null;
  const [field, needed] = unmet;
  return field in MONEY_FIELDS
    ? `You have ${formatMoney(state[field])} ${MONEY_FIELDS[field]}. This needs ${formatMoney(needed)}.`
    : `Your ${field} is ${state[field]}. This needs ${needed}.`;
}

// The price on the button: the cash change, or the savings it spends when it costs no cash.
const priceOf = (choice) =>
  choice.cash ? { cents: choice.cash, fromSavings: false } : { cents: Math.min(0, choice.savings ?? 0), fromSavings: choice.savings < 0 };

// props: { state, event }. onDone(choiceIndex) once, for an available choice.
export function render(root, { state, event }, onDone) {
  let done = false;
  const options = event.choices.map((choice, i) => {
    const reason = unmetReason(state, choice);
    const { cents, fromSavings } = priceOf(choice);
    const reasonId = `choice-reason-${i}`;
    return h(
      "li",
      {},
      h(
        "button",
        {
          class: "choice-option",
          type: "button",
          "aria-disabled": reason && "true",
          "aria-describedby": reason && reasonId,
          onclick: () => {
            if (reason || done) return;
            done = true;
            onDone(i);
          },
        },
        h("span", { class: "choice-option-label" }, choice.label),
        h("span", { class: cls("choice-option-price money", changeClass(cents)) }, signed(cents)),
        fromSavings && h("span", { class: "choice-option-from" }, "from savings"),
        reason && h("span", { class: "choice-option-reason", id: reasonId }, reason),
      ),
    );
  });

  show(
    root,
    h(
      "main",
      { class: "page choice" },
      h("header", { class: "choice-header" }, h("p", { class: "eyebrow" }, `Week ${state.week} of 4, day ${event.day}`), meters(state)),
      h(
        "section",
        { class: "choice-event", "aria-labelledby": "choice-title" },
        event.surprise && h("p", { class: "choice-tag" }, "Surprise"),
        h("h1", { class: "choice-title", id: "choice-title" }, event.title),
        h("p", { class: "choice-body" }, event.body),
      ),
      h("ul", { class: "choice-options" }, options),
    ),
  );
}
