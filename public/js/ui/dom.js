import { formatMoney } from "../game/engine.js";

const SVG = "http://www.w3.org/2000/svg";

// h("button", { class: "button", onclick }, "Text"): builds an element. Text is always set as text, never as HTML.
// A tag starting "svg:" is made in the SVG namespace.
export function h(tag, attrs = {}, ...children) {
  const el = tag.startsWith("svg:") ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name.startsWith("on")) el.addEventListener(name.slice(2), value);
    else if (value === true) el.setAttribute(name, "");
    else if (value !== false && value != null) el.setAttribute(name, value);
  }
  el.append(...children.flat(Infinity).filter((child) => child != null && child !== false));
  return el;
}

// Joins the class names that are not false or null.
export const cls = (...names) => names.filter(Boolean).join(" ");

// Replaces the screen and moves focus to its heading (or `focus`), so keyboard and screen reader users start at the top.
export function show(root, main, focus = main.querySelector("h1")) {
  root.replaceChildren(main);
  if (focus) {
    if (focus.tagName !== "BUTTON" && focus.tagName !== "INPUT") focus.tabIndex = -1;
    focus.focus();
  }
}

export const signed = (cents) => (cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents));

// money-in for a gain, money-out for a loss, nothing for no change.
export const changeClass = (n) => (n > 0 ? "money-in" : n < 0 ? "money-out" : null);

const MOOD_WORDS = ["low", "low", "low", "meh", "meh", "okay", "okay", "good", "good", "great", "great"];
export const moodWord = (mood) => MOOD_WORDS[mood];

// A duration token from tokens.css in ms. It is 0 under prefers-reduced-motion.
export const ms = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

// Runs fn after `wait` ms, or right away when there is nothing to wait for.
export const after = (wait, fn) => (wait > 0 ? setTimeout(fn, wait) : fn());

// Counts a money value's text from `from` to `to` cents over --duration-count, ease-out cubic. Instant when that is 0.
export function countTo(el, from, to) {
  const duration = ms("--duration-count");
  el.classList.toggle("is-negative", to < 0);
  if (duration === 0 || from === to) {
    el.textContent = formatMoney(to);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = formatMoney(Math.round(from + (to - from) * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = formatMoney(from);
  requestAnimationFrame(step);
}

const flash = (now, before) => (before === undefined || now === before ? null : now > before ? "is-up" : "is-down");

// The cash, savings and mood meters. With `prev`, each meter shows its change and counts from the old value.
export function meters(state, prev) {
  const change = (now, before, text) =>
    prev &&
    h("dd", { class: cls("meter-change", changeClass(now - before)) }, now === before ? "no change" : text(now - before));

  const money = (key, label) => {
    const value = h("dd", { class: cls("meter-value", state[key] < 0 && "is-negative") }, formatMoney(state[key]));
    if (prev) countTo(value, prev[key], state[key]);
    return h(
      "div",
      { class: cls("meter", `meter-${key}`, flash(state[key], prev?.[key])) },
      h("dt", { class: "meter-label" }, label),
      value,
      change(state[key], prev?.[key], signed),
    );
  };

  return h(
    "dl",
    { class: "meters" },
    money("cash", "Cash"),
    money("savings", "Saved"),
    h(
      "div",
      { class: cls("meter", "meter-mood", flash(state.mood, prev?.mood)), "data-mood": moodWord(state.mood), style: `--mood: ${state.mood}` },
      h("dt", { class: "meter-label" }, "Mood"),
      h("dd", { class: "meter-value" }, h("span", { class: "meter-mood-bar", "aria-hidden": "true" }), moodWord(state.mood)),
      change(state.mood, prev?.mood, (n) => (n > 0 ? `+${n}` : String(n))),
    ),
  );
}
