import { h, show } from "./dom.js";

// props: { questions, heading }. onDone(answers): one option index per question.
export function render(root, { questions, heading }, onDone) {
  const answers = [];
  const ask = (i) => {
    if (i === questions.length) return onDone(answers);
    const question = questions[i];
    const form = h(
      "form",
      {
        onsubmit: (e) => {
          e.preventDefault();
          answers.push(Number(new FormData(form).get("answer")));
          ask(i + 1);
        },
      },
      h(
        "fieldset",
        {},
        h("legend", {}, question.text),
        question.options.map((option, j) =>
          h("div", {}, h("label", {}, h("input", { type: "radio", name: "answer", value: j, required: true }), ` ${option}`)),
        ),
      ),
      h("button", { type: "submit" }, i === questions.length - 1 ? "Done" : "Next"),
    );
    show(root, h("h1", {}, heading), h("p", {}, `${i + 1} of ${questions.length}`), form);
  };
  ask(0);
}
