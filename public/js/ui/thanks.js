import { score } from "../quiz/quiz.js";
import { h, show } from "./dom.js";

// props: { questions, quizBefore, quizAfter, save }. save() resolves to { ok } or { ok: false, error }.
// onDone() when the player chooses to play again.
export function render(root, { questions, quizBefore, quizAfter, save }, onDone) {
  const status = h("p", { role: "status" });
  const retry = h("button", { type: "button", hidden: true, onclick: () => trySave() }, "Try again");

  const trySave = async () => {
    retry.hidden = true;
    status.textContent = "Saving your answers...";
    const result = await save();
    status.textContent = result.ok ? "Your answers were saved." : `Your answers could not be saved (${result.error}).`;
    retry.hidden = result.ok;
  };

  show(
    root,
    h("h1", {}, "Thanks for playing"),
    h("p", {}, `Before: ${score(quizBefore)} of ${questions.length}. After: ${score(quizAfter)} of ${questions.length}.`),
    h("h2", {}, "The right answers"),
    h("ol", {}, questions.map((question) => h("li", {}, `${question.text} ${question.options[question.correct]}`))),
    status,
    retry,
    h("button", { type: "button", onclick: () => onDone() }, "Play again"),
  );
  trySave();
}
