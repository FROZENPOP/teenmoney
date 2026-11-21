import { h, show } from "./dom.js";

// Shown on later loads after a successful save (ARCHITECTURE.md 3.4), built from the thanks markup.
// onDone() on "New student on this device".
export function render(root, props, onDone) {
  show(
    root,
    h(
      "main",
      { class: "page thanks" },
      h("header", {}, h("h1", {}, "You're finished.")),
      h(
        "section",
        { class: "thanks-save", "data-state": "saved" },
        h("p", { class: "thanks-save-title" }, "Your answers are saved."),
        h("p", {}, "Thanks for helping. You can close this page."),
      ),
      h(
        "div",
        { class: "thanks-actions" },
        h("button", { class: "button button-secondary button-block", type: "button", onclick: () => onDone() }, "New student on this device"),
      ),
    ),
  );
}
