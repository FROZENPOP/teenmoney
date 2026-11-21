import { score } from "../quiz/quiz.js";
import { h, show } from "./dom.js";

const SAVE_STATES = {
  saving: { role: "status", title: "Saving your answers…", text: "This takes a second." },
  saved: { role: "status", title: "Saved. Thanks for helping.", text: "You can close this page now." },
  error: {
    role: "alert",
    title: "We couldn't save your answers.",
    text: "Check the wifi, then try again. Your answers stay on this device until they're saved.",
  },
};

// props: { questions, quizBefore, quizAfter, save, playAgain }. save() resolves to { ok } or { ok: false, error }.
// onDone() when the player chooses to play again; the button only shows when playAgain is true.
export function render(root, { questions, quizBefore, quizAfter, save, playAgain }, onDone) {
  let status = h("section");

  const setState = (state) => {
    const { role, title, text } = SAVE_STATES[state];
    const retry = h("button", { class: "button button-block", type: "button", onclick: () => trySave() }, "Try again");
    const next = h(
      "section",
      { class: "thanks-save", "data-state": state, role },
      h("p", { class: "thanks-save-title" }, title),
      h("p", {}, text),
      state === "error" && retry,
    );
    const hadFocus = status.contains(document.activeElement);
    status.replaceWith(next);
    status = next;
    if (state === "error" && hadFocus) retry.focus();
  };

  const trySave = async () => {
    setState("saving");
    const result = await save();
    setState(result.ok ? "saved" : "error");
  };

  const before = score(quizBefore);
  const after = score(quizAfter);
  const change = after - before;

  show(
    root,
    h(
      "main",
      { class: "page thanks" },
      h("header", {}, h("h1", {}, playAgain ? "Thanks for playing." : "Thanks for taking part.")),
      status,
      h(
        "dl",
        { class: "thanks-scores" },
        h(
          "div",
          { class: "thanks-score" },
          h("dt", { class: "thanks-score-label" }, "Before"),
          h("dd", { class: "thanks-score-value" }, `${before} of ${questions.length}`),
        ),
        h(
          "div",
          { class: "thanks-score" },
          h("dt", { class: "thanks-score-label" }, "After"),
          h("dd", { class: "thanks-score-value" }, `${after} of ${questions.length}`),
          change !== 0 &&
            h("dd", { class: `thanks-score-change ${change > 0 ? "money-in" : "money-out"}` }, `${change > 0 ? "+" : ""}${change} right`),
        ),
      ),
      h(
        "section",
        { "aria-labelledby": "thanks-answers-title" },
        h("h2", { id: "thanks-answers-title" }, "The right answers"),
        h(
          "ol",
          { class: "thanks-answers" },
          questions.map((question, i) => {
            const right = quizAfter[i] === question.correct;
            return h(
              "li",
              { class: "thanks-answer" },
              h("p", { class: "thanks-answer-question" }, `${i + 1}. ${question.text}`),
              h("p", {}, `Right answer: ${question.options[question.correct]}`),
              h("p", {}, question.explain),
              h(
                "p",
                { class: `thanks-answer-mark ${right ? "is-right" : "is-wrong"}` },
                right ? "You got it" : `Not this time. You said: ${question.options[quizAfter[i]]}`,
              ),
            );
          }),
        ),
      ),
      playAgain &&
        h("div", { class: "thanks-actions" }, h("button", { class: "button button-secondary button-block", type: "button", onclick: () => onDone() }, "Play again")),
    ),
  );
  trySave();
}
