import { checkLock, formatMoney, hintsToShow, recordLockTry } from "../game/engine.js";
import { h, show } from "./dom.js";

// "621.92", "$98.08", "1,000" -> cents. Anything else -> null. No floating point.
export function toCents(text) {
  const match = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec(text.replace(/[\s,]/g, ""));
  return match ? Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0")) : null;
}

// props: { state, puzzle } for a "code" lock. onDone(stateWithLockRecorded).
export function render(root, { state, puzzle }, onDone) {
  let current = state;
  const heading = `Week ${state.week} door`;
  const opened = (text) =>
    show(root, h("h1", {}, heading), h("p", {}, text), h("button", { type: "button", onclick: () => onDone(current) }, "Keep going"));

  const input = h("input", { id: "lock-code", inputmode: "decimal", autocomplete: "off", required: true });
  const feedback = h("p", { role: "status" });
  const hints = h("ul");
  const howButton = h("button", { type: "button", hidden: true, onclick: () => opened(puzzle.explain) }, "Show me how");

  const attempt = () => {
    const cents = toCents(input.value);
    if (cents === null) {
      feedback.textContent = "Type an amount, like 12.34.";
      return;
    }
    const correct = checkLock(puzzle, cents);
    current = recordLockTry(current, puzzle.id, correct);
    if (correct) return opened("Correct. The door opens.");
    feedback.textContent = "Not yet. Try again.";
    hints.replaceChildren(...hintsToShow(current, puzzle).map((hint) => h("li", {}, `Hint: ${hint}`)));
    howButton.hidden = !current.locks.find((lock) => lock.puzzle === puzzle.id).hintUsed;
  };

  const doc = puzzle.document;
  show(
    root,
    h("h1", {}, heading),
    h("p", {}, puzzle.prompt),
    h(
      "table",
      {},
      h("caption", {}, doc.title),
      h("tbody", {}, doc.lines.map((line) => h("tr", {}, h("th", { scope: "row" }, line.label), h("td", {}, formatMoney(line.amount))))),
    ),
    h(
      "form",
      {
        onsubmit: (e) => {
          e.preventDefault();
          attempt();
        },
      },
      h("label", { for: "lock-code" }, `${doc.answerLabel} $`),
      input,
      h("button", { type: "submit" }, "Try the door"),
    ),
    feedback,
    hints,
    howButton,
  );
}
