// A small stand-in for the browser DOM, enough for the screen modules under node --test. No dependency.
// Also: tree() for comparing element structure, and parseMockup() to read a design/ page into the same shape.

import { readFileSync } from "node:fs";

class Text {
  constructor(data) {
    this.data = String(data);
    this.parentNode = null;
  }
  get textContent() {
    return this.data;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
}

const matches = (el, selector) => {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)((?:\[[\w-]+(?:="[^"]*")?\])*)$/i.exec(selector);
  if (!m) throw new Error(`fake-dom: unsupported selector ${selector}`);
  const [, tag, rest, attrs] = m;
  if (tag && el.localName !== tag.toLowerCase()) return false;
  for (const part of rest.match(/[.#][\w-]+/g) ?? []) {
    if (part[0] === "." && !el.classList.contains(part.slice(1))) return false;
    if (part[0] === "#" && el.id !== part.slice(1)) return false;
  }
  for (const [, name, value] of attrs.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
    if (!el.hasAttribute(name) || (value !== undefined && el.getAttribute(name) !== value)) return false;
  }
  return true;
};

class Element {
  constructor(tag, doc) {
    this.localName = tag.toLowerCase();
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.attrs = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.listeners = {};
    this.value = "";
    this.checked = false;
    const el = this;
    this.classList = {
      list: () => (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
      contains: (c) => el.classList.list().includes(c),
      add: (...cs) => el.setAttribute("class", [...new Set([...el.classList.list(), ...cs])].join(" ")),
      remove: (...cs) => el.setAttribute("class", el.classList.list().filter((x) => !cs.includes(x)).join(" ")),
      toggle: (c, on = !el.classList.contains(c)) => (on ? el.classList.add(c) : el.classList.remove(c), on),
    };
  }
  setAttribute(name, value) {
    this.attrs.set(name, String(value));
    if (name === "value") this.value = String(value);
  }
  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }
  hasAttribute(name) {
    return this.attrs.has(name);
  }
  removeAttribute(name) {
    this.attrs.delete(name);
  }
  get className() {
    return this.getAttribute("class") ?? "";
  }
  set className(v) {
    this.setAttribute("class", v);
  }
  get id() {
    return this.getAttribute("id") ?? "";
  }
  get hidden() {
    return this.hasAttribute("hidden");
  }
  set hidden(v) {
    if (v) this.setAttribute("hidden", "");
    else this.removeAttribute("hidden");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    if (v) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  set tabIndex(v) {
    this.setAttribute("tabindex", v);
  }
  get children() {
    return this.childNodes.filter((n) => n instanceof Element);
  }
  append(...nodes) {
    for (const node of nodes) {
      const child = node instanceof Element || node instanceof Text ? node : new Text(node);
      child.parentNode?.removeChild(child);
      child.parentNode = this;
      this.childNodes.push(child);
    }
  }
  removeChild(child) {
    this.childNodes = this.childNodes.filter((n) => n !== child);
    child.parentNode = null;
  }
  remove() {
    this.parentNode?.removeChild(this);
  }
  replaceChildren(...nodes) {
    for (const n of [...this.childNodes]) this.removeChild(n);
    this.append(...nodes);
  }
  replaceWith(node) {
    const parent = this.parentNode;
    const i = parent.childNodes.indexOf(this);
    node.parentNode?.removeChild(node);
    parent.childNodes.splice(i, 1, node);
    node.parentNode = parent;
    this.parentNode = null;
  }
  contains(node) {
    for (let n = node; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  get textContent() {
    return this.childNodes.map((n) => n.textContent).join("");
  }
  set textContent(v) {
    this.replaceChildren(String(v));
  }
  querySelectorAll(selector) {
    const found = [];
    const walk = (el) => {
      for (const child of el.children) {
        if (matches(child, selector)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(selector) {
    for (let n = this; n instanceof Element; n = n.parentNode) if (matches(n, selector)) return n;
    return null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }
  dispatch(type) {
    const event = { type, target: this, defaultPrevented: false, preventDefault: () => (event.defaultPrevented = true) };
    for (const fn of this.listeners[type] ?? []) fn(event);
    return event;
  }
  focus() {
    this.ownerDocument.activeElement = this;
  }
  // Like a user click: nothing on a disabled control; checkboxes and radios change; a submit button submits its form.
  click() {
    if (this.disabled) return;
    if (this.localName === "input" && (this.getAttribute("type") === "checkbox" || this.getAttribute("type") === "radio")) {
      this.checked = this.getAttribute("type") === "radio" ? true : !this.checked;
      this.dispatch("click");
      this.dispatch("change");
      return;
    }
    this.dispatch("click");
    if (this.localName === "button" && this.getAttribute("type") === "submit") this.closest("form")?.dispatch("submit");
  }
  type(text) {
    this.value = text;
    this.dispatch("input");
  }
}

// Installs document, getComputedStyle and requestAnimationFrame globals. reducedMotion: every duration token reads 0ms.
export function installDom() {
  const doc = {
    activeElement: null,
    createElement: (tag) => new Element(tag, doc),
    createElementNS: (_, tag) => new Element(tag, doc),
  };
  doc.documentElement = doc.createElement("html");
  doc.body = doc.createElement("body");
  globalThis.document = doc;
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "0ms" });
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 0);
  return doc;
}

// Element structure as nested arrays: [tag.class.class, ...children]. Text, whitespace, other attributes and hidden
// elements are ignored.
export function tree(el) {
  const classes = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort();
  return [[el.localName, ...classes].join("."), ...el.children.filter((c) => !c.hidden).map(tree)];
}

const VOID = new Set(["input", "br", "img", "meta", "link", "hr"]);

// Reads the <main> of a design/ mockup into the same shape as tree().
export function parseMockup(name) {
  const html = readFileSync(new URL(`../../design/${name}.html`, import.meta.url), "utf8");
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>") + "</main>".length).replace(/<!--[\s\S]*?-->/g, "");
  const root = { children: [] };
  const stack = [root];
  for (const [, close, tag, attrs, selfClose] of main.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
    if (close) {
      stack.pop();
      continue;
    }
    const classes = (/\bclass="([^"]*)"/.exec(attrs)?.[1] ?? "").split(/\s+/).filter(Boolean).sort();
    const node = { name: [tag.toLowerCase(), ...classes].join("."), hidden: /(^|\s)hidden(\s|=|$)/.test(attrs), children: [] };
    stack.at(-1).children.push(node);
    if (!selfClose && !VOID.has(tag.toLowerCase())) stack.push(node);
  }
  const toTree = (node) => [node.name, ...node.children.filter((c) => !c.hidden).map(toTree)];
  return toTree(root.children[0]);
}
