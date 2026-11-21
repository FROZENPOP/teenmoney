import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { save } from "../public/js/save.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("save posts the session and resolves ok on 201", async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, init };
    return new Response('{"ok":true}', { status: 201 });
  };
  assert.deepEqual(await save({ studyGroup: "play" }), { ok: true });
  assert.equal(sent.url, "/api/sessions");
  assert.equal(sent.init.method, "POST");
  assert.deepEqual(JSON.parse(sent.init.body), { studyGroup: "play" });
});

test("11. save resolves { ok: false, error } and never rejects", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };
  assert.deepEqual(await save({}), { ok: false, error: "could not reach the server" });

  globalThis.fetch = async () => new Response('{"ok":false,"error":"could not save"}', { status: 500 });
  assert.deepEqual(await save({}), { ok: false, error: "could not save" });

  globalThis.fetch = async () => new Response("<html>bad gateway</html>", { status: 502 });
  assert.deepEqual(await save({}), { ok: false, error: "the server answered 502" });
});
