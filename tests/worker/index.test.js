import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import worker from "../../worker/index.js";

const URL = "https://teenmoney.test/api/sessions";
const validPlay = () => ({
  studyGroup: "play",
  classCode: "P3-TUE",
  quizBefore: [0, 2, 1, 3, 0, 1],
  quizAfter: [1, 2, 1, 3, 2, 1],
  game: {
    ending: "scraped", finalCash: 3750, finalSavings: 0, finalMood: 4,
    choices: [{ event: "concert", choice: 1 }],
    locks: [{ puzzle: "pay-stub", wrongTries: 1, hintUsed: false }],
  },
});
const validRead = () => ({ studyGroup: "read", quizBefore: [0, 2, 1, 3, 0, 1], quizAfter: [1, 2, 1, 3, 2, 1] });

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

const post = (body, env = { DB: fakeDb() }) => worker.fetch(new Request(URL, { method: "POST", body }), env);

async function expect400(body, field) {
  const DB = fakeDb();
  const response = await post(JSON.stringify(body), { DB });
  const json = await response.json();
  assert.equal(response.status, 400, JSON.stringify(json));
  assert.equal(json.ok, false);
  assert.ok(json.error.includes(field), `"${json.error}" names ${field}`);
  assert.equal(DB.calls.length, 0);
}

test("6. valid play body: 201 and one insert, every value bound", async () => {
  const DB = fakeDb();
  const response = await post(JSON.stringify(validPlay()), { DB });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(DB.calls.length, 1);
  const { sql, values } = DB.calls[0];
  assert.match(sql, /INSERT INTO sessions/);
  assert.equal(sql.match(/\?\d+/g).length, 12);
  assert.doesNotMatch(sql, /P3-TUE|scraped|3750|concert|pay-stub/, "values are bound, not in the SQL");
  assert.match(values[0], /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(values[1])));
  assert.deepEqual(values.slice(2), [
    "P3-TUE", "play", "[0,2,1,3,0,1]", "[1,2,1,3,2,1]", "scraped", 3750, 0, 4,
    '[{"event":"concert","choice":1}]', '[{"puzzle":"pay-stub","wrongTries":1,"hintUsed":false}]',
  ]);
});

test("6. valid read body: 201 and one insert with nulls for the game columns", async () => {
  const DB = fakeDb();
  const response = await post(JSON.stringify(validRead()), { DB });
  assert.equal(response.status, 201);
  assert.equal(DB.calls.length, 1);
  assert.deepEqual(DB.calls[0].values.slice(2), [null, "read", "[0,2,1,3,0,1]", "[1,2,1,3,2,1]", null, null, null, null, null, null]);
});

test("6. the client cannot choose the id or timestamp", async () => {
  await expect400({ ...validRead(), id: "x" }, "id");
  await expect400({ ...validRead(), createdAt: "2020-01-01" }, "createdAt");
});

test("7. unknown fields are rejected at every level", async () => {
  await expect400({ ...validPlay(), name: "Sam" }, "name");
  const inGame = validPlay();
  inGame.game.score = 3;
  await expect400(inGame, "game.score");
  const inChoice = validPlay();
  inChoice.game.choices[0].label = "Buy a ticket";
  await expect400(inChoice, "game.choices[0].label");
  const inLock = validPlay();
  inLock.game.locks[0].answer = 9808;
  await expect400(inLock, "game.locks[0].answer");
});

test("7. bad studyGroup is a 400, never a 500", async () => {
  for (const studyGroup of ["both", "", null, 1, ["play"], undefined]) {
    await expect400({ ...validPlay(), studyGroup }, "studyGroup");
  }
});

test("7. classCode too long or with a forbidden character", async () => {
  await expect400({ ...validRead(), classCode: "ABCDEFGHIJKLM" }, "classCode");
  await expect400({ ...validRead(), classCode: "P3 TUE" }, "classCode");
  await expect400({ ...validRead(), classCode: "P3'--" }, "classCode");
  await expect400({ ...validRead(), classCode: "" }, "classCode");
  await expect400({ ...validRead(), classCode: 3 }, "classCode");
  assert.equal((await post(JSON.stringify({ ...validRead(), classCode: "ABCDEFGHIJKL" }))).status, 201);
});

test("7. quizBefore and quizAfter: wrong length, non-integer, out of 0..3", async () => {
  for (const key of ["quizBefore", "quizAfter"]) {
    for (const value of [[0, 1, 2, 3, 0], [0, 1, 2, 3, 0, 1, 2], [0, 1, 2, 3, 0, 1.5], [0, 1, 2, 3, 0, "1"], [0, 1, 2, 3, 0, 4], [0, 1, 2, 3, 0, -1], "012301", undefined]) {
      await expect400({ ...validRead(), [key]: value }, key);
    }
  }
});

test("7. game is required for play and absent for read", async () => {
  const { game, ...noGame } = validPlay();
  await expect400(noGame, "game");
  await expect400({ ...noGame, game: null }, "game");
  await expect400({ ...validRead(), game }, "game");
  await expect400({ ...validRead(), game: null }, "game");
});

test("7. bad ending", async () => {
  for (const ending of ["rich", "", null, undefined, 1]) {
    const body = validPlay();
    body.game.ending = ending;
    await expect400(body, "game.ending");
  }
});

test("7. every numeric field out of range or not an integer", async () => {
  const cases = [
    ["finalCash", [10000001, -10000001, 1.5, "3750", null, undefined]],
    ["finalSavings", [10000001, -10000001, 0.1, "0", null, undefined]],
    ["finalMood", [11, -1, 4.5, "4", null, undefined]],
  ];
  for (const [key, values] of cases) {
    for (const value of values) {
      const body = validPlay();
      body.game[key] = value;
      await expect400(body, `game.${key}`);
    }
  }
  for (const value of [10, -1, 1.5, "1", undefined]) {
    const body = validPlay();
    body.game.choices[0].choice = value;
    await expect400(body, "game.choices[0].choice");
  }
  for (const value of [100, -1, 1.5, "1", undefined]) {
    const body = validPlay();
    body.game.locks[0].wrongTries = value;
    await expect400(body, "game.locks[0].wrongTries");
  }
  const edges = validPlay();
  Object.assign(edges.game, { finalCash: -10000000, finalSavings: 10000000, finalMood: 10 });
  edges.game.choices[0].choice = 9;
  edges.game.locks[0].wrongTries = 99;
  assert.equal((await post(JSON.stringify(edges))).status, 201);
});

test("7. event and puzzle ids, and hintUsed", async () => {
  for (const value of ["Concert", "concert_1", "-concert", "a".repeat(41), "", 3, undefined]) {
    const choice = validPlay();
    choice.game.choices[0].event = value;
    await expect400(choice, "game.choices[0].event");
    const lock = validPlay();
    lock.game.locks[0].puzzle = value;
    await expect400(lock, "game.locks[0].puzzle");
  }
  for (const value of ["false", 0, null, undefined]) {
    const body = validPlay();
    body.game.locks[0].hintUsed = value;
    await expect400(body, "game.locks[0].hintUsed");
  }
  for (const key of ["choices", "locks"]) {
    for (const value of [undefined, null, {}, "[]"]) {
      const body = validPlay();
      body.game[key] = value;
      await expect400(body, `game.${key}`);
    }
    const body = validPlay();
    body.game[key] = [null];
    await expect400(body, `game.${key}[0]`);
  }
});

test("7. more than 40 choices or more than 4 locks", async () => {
  const forty = validPlay();
  forty.game.choices = Array.from({ length: 40 }, () => ({ event: "concert", choice: 1 }));
  forty.game.locks = Array.from({ length: 4 }, () => ({ puzzle: "pay-stub", wrongTries: 0, hintUsed: false }));
  assert.equal((await post(JSON.stringify(forty))).status, 201);
  const choices = structuredClone(forty);
  choices.game.choices.push({ event: "concert", choice: 1 });
  await expect400(choices, "game.choices");
  const locks = structuredClone(forty);
  locks.game.locks.push({ puzzle: "pay-stub", wrongTries: 0, hintUsed: false });
  await expect400(locks, "game.locks");
});

test("8. 413 when Content-Length says over 8 KB, before reading the body", async () => {
  let pulled = 0;
  const body = new ReadableStream({ pull: () => { pulled++; } });
  const DB = fakeDb();
  const request = new Request(URL, { method: "POST", headers: { "Content-Length": "8193" }, body, duplex: "half" });
  const response = await worker.fetch(request, { DB });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { ok: false, error: "too large" });
  assert.equal(DB.calls.length, 0);
  assert.ok(pulled <= 1, `pulled ${pulled} chunks`);
});

test("8. 413 when the body runs past 8 KB, without reading the rest", async () => {
  for (const headers of [{}, { "Content-Length": "100" }]) {
    let pulled = 0;
    const chunk = new Uint8Array(1024).fill(32);
    const body = new ReadableStream({ pull: (controller) => { pulled++; controller.enqueue(chunk); } });
    const DB = fakeDb();
    const response = await worker.fetch(new Request(URL, { method: "POST", headers, body, duplex: "half" }), { DB });
    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), { ok: false, error: "too large" });
    assert.equal(DB.calls.length, 0);
    assert.ok(pulled <= 12, `pulled ${pulled} chunks of an endless body`);
  }
});

test("8. exactly 8 KB is accepted", async () => {
  const json = JSON.stringify(validRead());
  const body = json + " ".repeat(8192 - json.length);
  assert.equal((await post(body)).status, 201);
  assert.equal((await post(body + " ")).status, 413);
});

test("9. 405 for GET, PUT and DELETE; 404 for another path", async () => {
  for (const method of ["GET", "PUT", "DELETE"]) {
    const DB = fakeDb();
    const response = await worker.fetch(new Request(URL, { method, body: method === "GET" ? undefined : "{}" }), { DB });
    assert.equal(response.status, 405, method);
    assert.deepEqual(await response.json(), { ok: false, error: "method not allowed" });
    assert.equal(DB.calls.length, 0);
  }
  for (const path of ["/api/session", "/api/sessions/1", "/"]) {
    const response = await worker.fetch(new Request(`https://teenmoney.test${path}`, { method: "POST", body: "{}" }), { DB: fakeDb() });
    assert.equal(response.status, 404, path);
  }
});

test("9. 400 for a body that is not JSON or not an object", async () => {
  for (const body of ["not json", "", "{", "null", "[]", "3"]) {
    const DB = fakeDb();
    const response = await post(body, { DB });
    assert.equal(response.status, 400, body);
    const json = await response.json();
    assert.equal(json.ok, false);
    assert.equal(typeof json.error, "string");
    assert.equal(DB.calls.length, 0);
  }
});

test("9. 500 with exactly 'could not save' when the database throws", async () => {
  const response = await post(JSON.stringify(validPlay()), { DB: fakeDb({ fail: true }) });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: "could not save" });
  const throwing = { prepare() { throw new Error("no such table: sessions"); } };
  const second = await post(JSON.stringify(validPlay()), { DB: throwing });
  assert.equal(second.status, 500);
  assert.deepEqual(await second.json(), { ok: false, error: "could not save" });
});

test("10. the Worker reads only url, method, body and two headers from the request", async () => {
  const real = new Request(URL, { method: "POST", body: JSON.stringify(validPlay()), headers: { "User-Agent": "x", Cookie: "a=1", "CF-Connecting-IP": "1.2.3.4" } });
  const touched = new Set();
  const asked = [];
  const headers = { get: (name) => (asked.push(name.toLowerCase()), Headers.prototype.get.call(real.headers, name)) };
  const request = new Proxy(real, {
    get(target, prop) {
      touched.add(prop);
      return prop === "headers" ? headers : Reflect.get(target, prop);
    },
  });
  const DB = fakeDb();
  const response = await worker.fetch(request, { DB });
  assert.equal(response.status, 201);
  assert.deepEqual([...touched].filter((p) => !["url", "method", "headers", "body"].includes(p)), []);
  assert.deepEqual(asked.filter((n) => n !== "content-length" && n !== "content-type"), []);
  assert.doesNotMatch(JSON.stringify(DB.calls[0].values), /1\.2\.3\.4|a=1/);
});

test("10. no file reads other headers or calls console", () => {
  const files = ["public/js/quiz", "worker", "tests/quiz", "tests/worker"]
    .flatMap((dir) => readdirSync(dir).map((f) => join(dir, f)))
    .concat(["public/js/save.js", "tests/save.test.js"])
    .filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bconsole\./, file);
    for (const [, name] of source.matchAll(/headers\.get\(\s*["'`]([^"'`]*)/g)) {
      assert.ok(["content-length", "content-type"].includes(name.toLowerCase()), `${file} reads header ${name}`);
    }
    assert.doesNotMatch(source, /headers\.get\(\s*[^"'`\s]/, `${file} reads a header by variable`);
  }
});
