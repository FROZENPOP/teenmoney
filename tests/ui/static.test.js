// Criterion 7: no console output, no innerHTML, and nothing in public/ points the page at another site.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const files = (dir) => readdirSync(dir, { recursive: true }).map((f) => join(dir, f)).filter((f) => /\.(js|html|css)$/.test(f));
const read = (f) => readFileSync(f, "utf8");
const owned = ["public/index.html", "public/js/main.js", ...files("public/js/ui")];

test("screens and controller have no console calls and no innerHTML", () => {
  for (const file of owned) {
    assert.doesNotMatch(read(file), /\bconsole\./, file);
    assert.doesNotMatch(read(file), /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, file);
  }
});

test("the page requests nothing from other sites", () => {
  for (const file of files("public")) {
    const urls = read(file).match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
    // The SVG namespace in dom.js is an identifier, never fetched.
    assert.deepEqual(urls.filter((url) => url !== "http://www.w3.org"), [], file);
  }
});
