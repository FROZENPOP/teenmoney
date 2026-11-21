import { score } from "../quiz/quiz.js";
import { h, show } from "./dom.js";

const SAVE_STATES = {
  saving: { title: "Saving your answers…", text: "This takes a second." },
  saved: { title: "Saved. Thanks for helping.", text: "You can close this page now." },
  error: {
    title: "We couldn't save your answers.",
    text: "Check the wifi, then try again. Your answers stay on this device until they're saved.",
  },
};

// What to do after a failed save. The server's rate limit gets its own words; anything else is a connection problem.
const errorText = (error) =>
  error === "too many requests"
    ? "Too many people saved from this network at once. Wait a minute, then try again. Your answers stay on this device until they're saved."
    : SAVE_STATES.error.text;

// props: { questions, quizBefore, quizAfter, save }. save() resolves to { ok } or { ok: false, error }.
// The study build has no replay, so onDone is never called. A failed save shows "Try again".
export function render(root, { questions, quizBefore, quizAfter, save }) {
  // One status region that stays in the page; only its text changes, so screen readers hear each change.
  const title = h("p", { class: "thanks-save-title", tabindex: "-1" });
  const text = h("p");
  const retry = h("button", { class: "button button-block", type: "button", hidden: true, onclick: () => trySave() }, "Try again");
  const status = h("section", { class: "thanks-save", role: "status" }, title, text, retry);

  const setState = (state, error) => {
    status.setAttribute("data-state", state);
    title.textContent = SAVE_STATES[state].title;
    text.textContent = state === "error" ? errorText(error) : SAVE_STATES[state].text;
    retry.hidden = state !== "error";
  };

  const trySave = async () => {
    const retrying = document.activeElement === retry;
    setState("saving");
    const result = await save();
    setState(result.ok ? "saved" : "error", result.error);
    if (retrying) (result.ok ? title : retry).focus();
  };

  const before = score(quizBefore);
  const after = score(quizAfter);
  const change = after - before;

  show(
    root,
    h(
      "main",
      { class: "page thanks" },
      h("header", {}, h("h1", {}, "Thanks for taking part.")),
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
    ),
  );
  trySave();
}
