import { formatMoney } from "../game/engine.js";

// h("button", { type: "button", onclick }, "Text"): builds an element. Text is always set as text, never as HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith("on")) el.addEventListener(name.slice(2), value);
    else if (value === true) el.setAttribute(name, "");
    else if (value !== false && value != null) el.setAttribute(name, value);
  }
  el.append(...children.flat().filter((child) => child != null && child !== false));
  return el;
}

// Replaces the screen and moves focus to its heading so keyboard and screen reader users start at the top.
export function show(root, ...children) {
  root.replaceChildren(...children.flat());
  const heading = root.querySelector("h1");
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
}

export const signed = (cents) => (cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents));

const MOOD_WORDS = ["awful", "awful", "low", "low", "meh", "okay", "okay", "good", "good", "great", "great"];

export const meters = (state) =>
  h("p", {}, `${formatMoney(state.cash)} cash, ${formatMoney(state.savings)} saved, mood: ${MOOD_WORDS[state.mood]} (${state.mood} of 10)`);
