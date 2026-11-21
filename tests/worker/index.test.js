import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../../worker/index.js";

const URL = "https://teenmoney.test/api/sessions";
const valid = {
  studyGroup: "play",
  classCode: "P3-TUE",
  quizBefore: [0, 2, 1, 3, 0, 1],
  quizAfter: [1, 2, 1, 3, 2, 1],
  game: {
    ending: "scraped", finalCash: 3750, finalSavings: 0, finalMood: 4,
    choices: [{ event: "concert", choice: 1 }],
    locks: [{ puzzle: "pay-stub", wrongTries: 1, hintUsed: false }],
  },
};

function fakeDb({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) {
          calls.push({ sql, values });
          return { run: async () => (fail ? Promise.reject(new Error("D1 down")) : { success: true }) };
        },
      };
    },
  };
}

const post = (body, env) => worker.fetch(new Request(URL, { method: "POST", body }), env);

test("10. valid body: 201 and one insert with bound values", async () => {
  const DB = fakeDb();
  const response = await post(JSON.stringify(valid), { DB });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(DB.calls.length, 1);
  const { sql, values } = DB.calls[0];
  assert.match(sql, /INSERT INTO sessions/);
  assert.doesNotMatch(sql, /P3-TUE|scraped/, "values are bound, not in the SQL");
  assert.match(values[0], /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(values[1])));
  assert.deepEqual(values.slice(2), [
    "P3-TUE", "play", "[0,2,1,3,0,1]", "[1,2,1,3,2,1]", "scraped", 3750, 0, 4,
    '[{"event":"concert","choice":1}]', '[{"puzzle":"pay-stub","wrongTries":1,"hintUsed":false}]',
  ]);
});

test("10. read-group body binds nulls for the game columns", async () => {
  const DB = fakeDb();
  const { game, classCode, ...read } = valid;
  const response = await post(JSON.stringify({ ...read, studyGroup: "read" }), { DB });
  assert.equal(response.status, 201);
  assert.deepEqual(DB.calls[0].values.slice(2), [null, "read", "[0,2,1,3,0,1]", "[1,2,1,3,2,1]", null, null, null, null, null, null]);
});

test("10. 405 for anything but POST", async () => {
  const DB = fakeDb();
  const response = await worker.fetch(new Request(URL), { DB });
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { ok: false, error: "method not allowed" });
  assert.equal(DB.calls.length, 0);
});

test("10. 413 for a body over 8 KB", async () => {
  const DB = fakeDb();
  const response = await post(JSON.stringify({ ...valid, pad: "x".repeat(8192) }), { DB });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { ok: false, error: "too large" });
  assert.equal(DB.calls.length, 0);
});

test("10. 400 for a body that is not JSON or lacks a required field", async () => {
  for (const body of ["not json", "null", "[]", ...["studyGroup", "quizBefore", "quizAfter"].map((key) => {
    const copy = { ...valid };
    delete copy[key];
    return JSON.stringify(copy);
  })]) {
    const DB = fakeDb();
    const response = await post(body, { DB });
    assert.equal(response.status, 400, body);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(typeof json.error, "string");
    assert.equal(DB.calls.length, 0);
  }
});

test("10. 500 with 'could not save' on a database error", async () => {
  const response = await post(JSON.stringify(valid), { DB: fakeDb({ fail: true }) });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: "could not save" });
});
