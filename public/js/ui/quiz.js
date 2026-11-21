import { cls, h, show } from "./dom.js";

// props: { questions, eyebrow }. One question at a time. onDone(answers): one option index per question.
export function render(root, { questions, eyebrow }, onDone) {
  const answers = [];
  const ask = (i) => {
    const question = questions[i];
    let picked = null;
    const next = h(
      "button",
      { class: "button button-block", type: "submit", disabled: true },
      i === questions.length - 1 ? "Done" : "Next question",
    );
    const legend = h("legend", { class: "quiz-question-text" }, question.text);
    const form = h(
      "form",
      {
        class: "quiz-form",
        onsubmit: (e) => {
          e.preventDefault();
          if (picked === null) return;
          answers.push(picked);
          if (answers.length === questions.length) onDone(answers);
          else ask(i + 1);
        },
      },
      h(
        "fieldset",
        { class: "quiz-question" },
        legend,
        h(
          "div",
          { class: "quiz-options" },
          question.options.map((option, j) =>
            h(
              "label",
              { class: "quiz-option" },
              h("input", {
                class: "quiz-option-input",
                type: "radio",
                name: "quiz-answer",
                value: j,
                onchange: () => {
                  picked = j;
                  next.disabled = false;
                },
              }),
              h("span", { class: "quiz-option-text" }, option),
            ),
          ),
        ),
      ),
      next,
    );
    const main = h(
      "main",
      { class: "page quiz" },
      h(
        "header",
        { class: "quiz-header" },
        h("p", { class: "eyebrow" }, eyebrow),
        h(
          "div",
          { class: "quiz-progress" },
          h("p", { class: "quiz-progress-text" }, `${i + 1} of ${questions.length}`),
          h(
            "ol",
            { class: "quiz-progress-steps", "aria-hidden": "true" },
            questions.map((_, j) => h("li", { class: cls(j < i && "is-done", j === i && "is-current") || null })),
          ),
        ),
      ),
      form,
    );
    show(root, main, legend);
  };
  ask(0);
}
