import { checkLock, formatMoney, hintsToShow, recordLockTry } from "../game/engine.js";
import { changeClass, cls, h, show, signed } from "./dom.js";

// "98.08", "$98.08", "98", "98.0", "1,000" -> cents. Anything else -> null. No floating point.
export function toCents(text) {
  const match = /^\$?(\d+)(?:\.(\d{1,2}))?$/.exec(text.replace(/[\s,]/g, ""));
  return match ? Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0")) : null;
}

const tries = (n) => `${n} wrong ${n === 1 ? "try" : "tries"} so far. Trying again costs nothing.`;

const NEXT_HINT = [
  "Hint 1 shows after two wrong tries.",
  "Hint 1 shows after one more wrong try.",
  "Hint 2 shows after one more wrong try.",
  "After one more wrong try you can ask how it's done.",
];

const hint = (label, text) => h("li", { class: "lock-hint" }, h("span", { class: "lock-hint-label" }, label), text);

const docHead = (doc, id) =>
  (doc.title || doc.meta) &&
  h(
    "div",
    { class: "lock-document-head" },
    doc.title && h("h2", { class: "doc-title", id }, doc.title),
    doc.meta && h("p", { class: "doc-meta" }, doc.meta),
  );

const amountRow = ({ label, amount }) =>
  h("tr", {}, h("th", { scope: "row" }, label), h("td", { class: cls("doc-amount money", amount < 0 && "money-out") }, formatMoney(amount)));

// Each kind returns { document, read, field?, after? }: the document to show, read() -> { input } or { error } for a
// plain message, the input to mark invalid, and anything shown under the document.
const KINDS = {
  code(doc) {
    const input = h("input", {
      class: "lock-code-input",
      id: "lock-code-input",
      name: "code",
      type: "text",
      inputmode: "decimal",
      autocomplete: "off",
    });
    const groups = doc.options
      ? doc.options.flatMap((option) => [h("tr", {}, h("th", { colspan: "2", scope: "rowgroup" }, option.label)), option.lines.map(amountRow)])
      : doc.lines.map(amountRow);
    const document = h(
      "article",
      { class: "lock-document doc doc-stub", "aria-labelledby": doc.title && "lock-document-title" },
      docHead(doc, "lock-document-title"),
      h(
        "table",
        { class: "doc-table" },
        h("tbody", {}, groups),
        h(
          "tfoot",
          {},
          h(
            "tr",
            { class: "lock-code-row" },
            h("th", { scope: "row" }, h("label", { for: "lock-code-input" }, doc.answerLabel)),
            h("td", { class: "doc-amount" }, h("span", { class: "lock-code-entry" }, "$", input)),
          ),
        ),
      ),
    );
    return {
      document,
      field: input,
      read: () => {
        if (input.value.trim().startsWith("-")) return { error: "Leave out the minus sign." };
        const cents = toCents(input.value);
        return cents === null ? { error: "Type the amount in dollars and cents, like 12.34." } : { input: cents };
      },
    };
  },

  spot(doc) {
    let marked = null;
    const choice = h("p", { class: "lock-spot-choice", role: "status" }, "Nothing marked yet.");
    let balance = 0;
    const lines = doc.lines.map((line) => {
      balance += line.amount;
      const description = h("span", {}, line.description);
      const mark = h("span", { class: "lock-spot-mark" }, "Marked");
      const button = h(
        "button",
        {
          class: "lock-spot-line",
          type: "button",
          "aria-pressed": "false",
          onclick: () => {
            for (const other of lines) {
              other.button.setAttribute("aria-pressed", "false");
              other.mark.remove();
            }
            button.setAttribute("aria-pressed", "true");
            description.append(mark);
            marked = line.id;
            choice.replaceChildren("You marked: ", h("strong", {}, `${line.description}, ${signed(line.amount)}`));
          },
        },
        h("span", { class: "lock-spot-date" }, line.date),
        description,
        h("span", { class: cls("money", changeClass(line.amount)) }, signed(line.amount)),
        h("span", { class: cls("lock-spot-balance money", balance < 0 && "money-negative") }, formatMoney(balance)),
      );
      return { button, mark };
    });
    const summary = (label, cents) =>
      h("div", { class: "lock-spot-summary" }, h("span", {}, label), h("span", { class: cls("money", cents < 0 && "money-negative") }, formatMoney(cents)));
    const document = h(
      "article",
      { class: "lock-document doc doc-statement", "aria-labelledby": doc.title && "lock-document-title" },
      docHead(doc, "lock-document-title"),
      summary("Starting balance", 0),
      h(
        "div",
        { class: "lock-spot-table" },
        h(
          "div",
          { class: "lock-spot-columns", "aria-hidden": "true" },
          h("span", {}, "Day"),
          h("span", {}, "Description"),
          h("span", {}, "Amount"),
          h("span", { class: "lock-spot-balance" }, "Balance"),
        ),
        h("ol", { class: "lock-spot-lines" }, lines.map(({ button }) => h("li", {}, button))),
      ),
      summary("Ending balance", balance),
    );
    return {
      document,
      after: choice,
      read: () => (marked === null ? { error: "Tap a line on the statement first." } : { input: marked }),
    };
  },

  pick(doc) {
    const picked = new Set();
    const pickedCell = h("td", { class: "doc-amount money" }, "$0.00");
    const pickedLabel = h("th", { scope: "row" }, "Your picks");
    const day30 = h("td", { class: "doc-amount money money-negative" }, formatMoney(-doc.shortfall));
    const status = h("p", { class: "lock-pick-status" });
    const tally = () => {
      const sum = doc.options.filter((o) => picked.has(o.id)).reduce((total, o) => total + o.amount, 0);
      const left = sum - doc.shortfall;
      pickedLabel.textContent = picked.size ? `Your ${picked.size} ${picked.size === 1 ? "pick" : "picks"}` : "Your picks";
      pickedCell.className = cls("doc-amount money", changeClass(sum));
      pickedCell.textContent = signed(sum);
      day30.className = cls("doc-amount money", left < 0 ? "money-negative" : "money-in");
      day30.textContent = left < 0 ? formatMoney(left) : `+${formatMoney(left)}`;
      status.textContent = left < 0 ? `Still ${formatMoney(-left)} short.` : "That reaches day 30.";
    };
    tally();
    const document = h(
      "fieldset",
      { class: "lock-document doc", "aria-describedby": "lock-pick-help" },
      h("legend", { class: "visually-hidden" }, doc.title ?? "Ways to close the gap"),
      h(
        "div",
        { class: "lock-document-head" },
        doc.title && h("h2", { class: "doc-title" }, doc.title),
        h("p", { class: "doc-meta", id: "lock-pick-help" }, doc.meta ?? "Pick as many as you like."),
      ),
      h(
        "div",
        { class: "lock-pick-options" },
        doc.options.map((option) =>
          h(
            "label",
            { class: "lock-pick-option" },
            h("input", {
              class: "lock-pick-check",
              type: "checkbox",
              name: "pick",
              value: option.id,
              onchange: (e) => {
                if (e.target.checked) picked.add(option.id);
                else picked.delete(option.id);
                tally();
              },
            }),
            h("span", { class: "lock-pick-label" }, option.label),
            h("span", { class: cls("lock-pick-amount money", changeClass(option.amount)) }, signed(option.amount)),
            option.mood ? h("span", { class: "lock-pick-note" }, `Mood ${option.mood > 0 ? "+" : ""}${option.mood}`) : null,
          ),
        ),
      ),
    );
    const receipt = h(
      "section",
      { class: "lock-pick-tally doc doc-receipt", "aria-labelledby": "lock-pick-tally-title", "aria-live": "polite" },
      h("h2", { class: "doc-title", id: "lock-pick-tally-title" }, "Running total"),
      h(
        "table",
        { class: "doc-table" },
        h(
          "tbody",
          {},
          h("tr", {}, h("th", { scope: "row" }, "Short by"), h("td", { class: "doc-amount money money-out" }, formatMoney(-doc.shortfall))),
          h("tr", {}, pickedLabel, pickedCell),
        ),
        h("tfoot", {}, h("tr", {}, h("th", { scope: "row" }, "Day 30"), day30)),
      ),
      status,
    );
    return {
      document: h("div", { class: "lock-pick-layout" }, document, receipt),
      read: () => (picked.size ? { input: [...picked].sort() } : { error: "Pick at least one move first." }),
    };
  },
};

// props: { state, puzzle, onTry? } for any lock kind. onTry(state) after every counted try, so wrong tries can be saved
// as they happen; a state that already has wrong tries for this puzzle shows its hints straight away.
// onDone(stateWithLockRecorded) after the door opens.
export function render(root, { state, puzzle, onTry = () => {} }, onDone) {
  let current = state;
  const kind = KINDS[puzzle.kind](puzzle.document);
  const wrongTries = () => current.locks.find((lock) => lock.puzzle === puzzle.id)?.wrongTries ?? 0;

  // The feedback region stays in the page and only its text changes, so screen readers hear every try.
  const result = h("p", { class: "lock-feedback-result", hidden: true });
  const count = h("p", { hidden: true });
  const feedback = h("div", { class: "lock-feedback", id: "lock-feedback", role: "status" }, result, count);
  const hints = h("ol", { class: "lock-hints", hidden: true });
  const how = h("button", { class: "button button-secondary button-block", type: "button", hidden: true, onclick: () => open(true) }, "Show me how");
  const form = h(
    "form",
    {
      class: "lock-form",
      onsubmit: (e) => {
        e.preventDefault();
        attempt();
      },
    },
    kind.document,
    kind.after,
    feedback,
    hints,
    h("div", { class: "lock-actions" }, h("button", { class: "button button-block", type: "submit" }, "Try the door"), how),
  );
  const main = h(
    "main",
    { class: cls("page", puzzle.kind !== "code" && "page-wide", "lock", `lock-${puzzle.kind}`) },
    h("header", { class: "lock-header" }, h("p", { class: "eyebrow" }, `Week ${puzzle.week} door`), h("h1", { class: "lock-prompt" }, puzzle.prompt)),
    form,
  );

  const say = (resultText) => {
    const n = wrongTries();
    result.textContent = resultText;
    result.hidden = false;
    count.textContent = n ? tries(n) : "";
    count.hidden = !n;
    kind.field?.setAttribute("aria-invalid", "true");
    kind.field?.setAttribute("aria-describedby", "lock-feedback");
  };

  const showHints = () => {
    const n = wrongTries();
    hints.hidden = false;
    hints.replaceChildren(
      ...hintsToShow(current, puzzle).map((text, i) => hint(`Hint ${i + 1}`, text)),
      ...(n < 4 ? [h("li", { class: "lock-hint-next" }, NEXT_HINT[n])] : []),
    );
    how.hidden = n < 4;
  };

  const open = (showedHow) => {
    const next = h(
      "button",
      { class: "button button-block", type: "button", onclick: () => onDone(current) },
      puzzle.week === 4 ? "See your month" : "Next week",
    );
    form.replaceWith(
      h(
        "div",
        { class: "lock-form" },
        showedHow && h("ol", { class: "lock-hints" }, hint("How it works", puzzle.explain)),
        h("p", { class: "money-in", role: "status" }, showedHow ? "The door opens. You've got it now." : "That's it. The door opens."),
        h("div", { class: "lock-actions" }, next),
      ),
    );
    next.focus();
  };

  const attempt = () => {
    const { input, error } = kind.read();
    if (error) return say(error);
    const correct = checkLock(puzzle, input);
    current = recordLockTry(current, puzzle.id, correct);
    onTry(current);
    if (correct) return open(false);
    say("Not yet. The door stays shut.");
    showHints();
  };

  show(root, main);
  if (wrongTries()) {
    count.textContent = tries(wrongTries());
    count.hidden = false;
    showHints();
  }
}
