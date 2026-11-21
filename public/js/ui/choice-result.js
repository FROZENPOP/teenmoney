import { h, meters, show } from "./dom.js";

// props: { state, prev, event, choiceIndex }: the state after the choice and the one before it. onDone() on "Keep going".
export function render(root, { state, prev, event, choiceIndex }, onDone) {
  const choice = event.choices[choiceIndex];
  // Focus goes to the consequence, so a screen reader reads the result before the button.
  const line = h("p", { class: "choice-result-line" }, choice.result);
  show(
    root,
    h(
      "main",
      { class: "page choice-result" },
      h("header", { class: "choice-header" }, h("p", { class: "eyebrow" }, `Week ${state.week} of 4, day ${state.day}`), meters(state, prev)),
      h(
        "section",
        { class: "choice-result-body", "aria-live": "polite" },
        h("p", { class: "choice-result-picked" }, `You chose: ${choice.label}`),
        line,
      ),
      h("button", { class: "button button-block", type: "button", onclick: () => onDone() }, "Keep going"),
    ),
    line,
  );
}
