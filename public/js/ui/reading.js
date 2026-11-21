import { h, show } from "./dom.js";

// props: { reading: { title, paragraphs } }. onDone() on "I've read it".
export function render(root, { reading }, onDone) {
  show(
    root,
    h(
      "main",
      { class: "page reading" },
      h("p", { class: "eyebrow" }, "Read this, then six more questions"),
      h("article", { class: "reading-article doc" }, h("h1", {}, reading.title), reading.paragraphs.map((text) => h("p", {}, text))),
      h("button", { class: "button button-block", type: "button", onclick: () => onDone() }, "I've read it"),
    ),
  );
}
