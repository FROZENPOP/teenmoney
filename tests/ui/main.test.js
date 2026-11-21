// Criteria 4 and 5: the controller runs both flows with stand-in screens, autosaves after every screen, resumes
// where the player was, clears the save once it reaches the server, and carries on when storage throws.
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordLockTry } from "../../public/js/game/engine.js";
import { STORAGE_KEY, newSession, run } from "../../public/js/main.js";
import { unmetReason } from "../../public/js/ui/choice.js";

const memoryStorage = () => {
  const items = new Map();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
};

const brokenStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("full");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

// Stand-in screens that answer at once. `stop(name, props)` true leaves that screen waiting, like a player who left.
// Resolves with the log of screens drawn when thanks has finished saving, or when a screen is stopped.
function play({ storage, search = "", saveResult = { ok: true }, stop = () => false }) {
  return new Promise((resolve) => {
    const drawn = [];
    const saved = [];
    const screen = (name, answer) => ({
      render: (root, props, onDone) => {
        drawn.push({ name, props });
        if (stop(name, props)) return resolve({ drawn, saved, stopped: true });
        answer(props, onDone);
      },
    });
    const screens = {
      quiz: screen("quiz", (props, done) => done(props.questions.map((q) => q.correct))),
      payday: screen("payday", (_, done) => done()),
      choice: screen("choice", ({ state, event }, done) => done(event.choices.findIndex((c) => !unmetReason(state, c)))),
      choiceResult: screen("choiceResult", (_, done) => done()),
      lock: screen("lock", ({ state, puzzle }, done) => done(recordLockTry(state, puzzle.id, true))),
      results: screen("results", (_, done) => done()),
      reading: screen("reading", (_, done) => done()),
      thanks: screen("thanks", async (props) => {
        await props.save();
        resolve({ drawn, saved, thanks: props });
      }),
    };
    const saveSession = async (record) => {
      saved.push(record);
      return saveResult;
    };
    run({ root: {}, storage, search, random: () => 0, saveSession, screens });
  });
}

const names = (drawn) => [...new Set(drawn.map((d) => d.name))];

test("play flow: quiz, payday, four rooms with a lock each, results, quiz, thanks; the game finishes", async () => {
  const { drawn, saved } = await play({ storage: memoryStorage(), search: "?class=P3-TUE" });
  assert.deepEqual(names(drawn), ["quiz", "payday", "choice", "choiceResult", "lock", "results", "thanks"]);
  assert.deepEqual(drawn.filter((d) => d.name === "lock").map((d) => d.props.state.week), [1, 2, 3, 4]);
  const results = drawn.find((d) => d.name === "results");
  assert.equal(results.props.state.finished, true);
  assert.equal(results.props.state.day, 30);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].studyGroup, "play");
  assert.equal(saved[0].classCode, "P3-TUE");
  assert.equal(saved[0].game.locks.length, 4);
  // Each room: its fixed events in day order, then one surprise.
  for (let week = 1; week <= 4; week++) {
    const room = drawn.filter((d) => d.name === "choice" && d.props.state.week === week).map((d) => d.props.event);
    assert.ok(room.at(-1).surprise, `week ${week} ends with a surprise`);
    const fixed = room.slice(0, -1);
    assert.ok(fixed.length > 0 && fixed.every((e) => !e.surprise));
    assert.deepEqual(fixed.map((e) => e.day), fixed.map((e) => e.day).sort((a, b) => a - b));
  }
});

test("read flow: quiz, reading, quiz, thanks, and no game screen", async () => {
  const { drawn, saved, thanks } = await play({ storage: memoryStorage(), search: "?group=read" });
  assert.deepEqual(drawn.map((d) => d.name), ["quiz", "reading", "quiz", "thanks"]);
  assert.equal(saved[0].studyGroup, "read");
  assert.equal(saved[0].game, undefined);
  assert.equal(thanks.playAgain, false);
});

test("a class code the server would refuse is dropped", () => {
  assert.equal(newSession("?class=P3-TUE").classCode, "P3-TUE");
  assert.equal(newSession("?class=much-too-long-code").classCode, undefined);
  assert.equal(newSession("?class=<b>").classCode, undefined);
});

test("autosave: a reload in week 2 resumes on the same screen with the same state", async () => {
  const storage = memoryStorage();
  const inWeek2 = (name, props) => name === "choice" && props.state.week === 2 && props.event.surprise;
  const first = await play({ storage, stop: inWeek2 });
  const left = first.drawn.at(-1).props;
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.screen, "choice");
  assert.deepEqual(saved.state, left.state);

  const second = await play({ storage, stop: () => true });
  assert.equal(second.drawn[0].name, "choice");
  assert.deepEqual(second.drawn[0].props.state, left.state);
  assert.equal(second.drawn[0].props.event.id, left.event.id);
});

test("autosave: after every screen the session is stored, and a successful save clears it", async () => {
  const storage = memoryStorage();
  const afterPayday = await play({ storage, stop: (name) => name === "choice" });
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).screen, "choice");
  assert.equal(afterPayday.drawn.length, 3);

  await play({ storage });
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("autosave: a failed save keeps the session, so a reload returns to thanks", async () => {
  const storage = memoryStorage();
  await play({ storage, saveResult: { ok: false, error: "could not save" } });
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).screen, "thanks");
  const again = await play({ storage });
  assert.deepEqual(again.drawn.map((d) => d.name), ["thanks"]);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("autosave: unreadable saved data starts a fresh session", async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, "{not json");
  const { drawn } = await play({ storage, stop: () => true });
  assert.equal(drawn[0].name, "quiz");
  storage.setItem(STORAGE_KEY, JSON.stringify({ screen: "choice", room: ["no-such-event"], index: 0 }));
  assert.equal((await play({ storage, stop: () => true })).drawn[0].name, "quiz");
});

test("autosave: storage that throws does not stop the game", async () => {
  const { saved } = await play({ storage: brokenStorage });
  assert.equal(saved.length, 1);
  const { drawn } = await play({ storage: null, search: "?group=read" });
  assert.equal(drawn.at(-1).name, "thanks");
});

test("play again: clears the saved session and starts a fresh one from the first quiz", async () => {
  const storage = memoryStorage();
  const drawn = [];
  let thanksSeen = 0;
  await new Promise((resolve) => {
    const screen = (name, answer) => ({
      render: (root, props, done) => {
        drawn.push(name);
        answer(props, done);
      },
    });
    run({
      root: {},
      storage,
      search: "?group=read",
      saveSession: async () => ({ ok: false, error: "offline" }),
      screens: {
        quiz: screen("quiz", (p, done) => done(p.questions.map(() => 0))),
        reading: screen("reading", (_, done) => done()),
        thanks: screen("thanks", (_, done) => {
          if (++thanksSeen === 2) return resolve();
          storage.removed = false;
          const remove = storage.removeItem;
          storage.removeItem = (key) => {
            storage.removed = true;
            remove(key);
          };
          done();
        }),
      },
    });
  });
  assert.equal(storage.removed, true);
  assert.deepEqual(drawn, ["quiz", "reading", "quiz", "thanks", "quiz", "reading", "quiz", "thanks"]);
});
