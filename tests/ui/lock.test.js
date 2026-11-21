import assert from "node:assert/strict";
import { test } from "node:test";
import { toCents } from "../../public/js/ui/lock.js";

test("toCents turns typed amounts into whole cents", () => {
  assert.equal(toCents("98.08"), 9808);
  assert.equal(toCents("$98.08"), 9808);
  assert.equal(toCents(" $ 621.92 "), 62192);
  assert.equal(toCents("98.8"), 9880);
  assert.equal(toCents("98"), 9800);
  assert.equal(toCents("1,000.00"), 100000);
  for (const bad of ["", "abc", "98.088", "-98.08", "$", "9.8.0"]) assert.equal(toCents(bad), null, bad);
});
