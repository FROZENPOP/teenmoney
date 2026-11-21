// The controller, with stand-in screens that answer at once: both flows (criterion 4), autosave (criterion 5) and the
// autosave rules in ARCHITECTURE.md 3.4: never stuck, the link wins, day order, saved lock tries, one finished session.
import assert from "node:assert/strict";
import { test } from "node:test";
import { events } from "../../public/js/content/events.js";
import { recordLockTry } from "../../public/js/game/engine.js";
import { DONE_KEY, STORAGE_KEY, newSession, run } from "../../public/js/main.js";
import { unmetReason } from "../../public/js/ui/choice.js";

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 11, 2, 9);

const memoryStorage = () => {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
};
const read = (storage, key = STORAGE_KEY) => JSON.parse(storage.getItem(key));

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
// Resolves when thanks has finished saving, or when a screen is stopped. `lockWrongTries` wrong tries come before the
// right answer on every lock.
function play({ storage, search = "", saveResult = { ok: true }, stop = () => false, now = T0, lockWrongTries = 0 }) {
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
      payday: screen("payday", ({ state }, done) => done(state.cash)),
      choice: screen("choice", ({ state, event }, done) => done(event.choices.findIndex((c) => state.week && !unmetReason(state, c)))),
      choiceResult: screen("choiceResult", (_, done) => done()),
      lock: screen("lock", ({ state, puzzle, onTry }, done) => {
        let s = state;
        for (let i = 0; i < lockWrongTries; i++) onTry((s = recordLockTry(s, puzzle.id, false)));
        done(recordLockTry(s, puzzle.id, true));
      }),
      results: screen("results", (_, done) => done()),
      reading: screen("reading", (_, done) => done()),
      thanks: screen("thanks", async (props) => resolve({ drawn, saved, result: await props.save() })),
      finished: screen("finished", (_, done) => done()),
    };
    const saveSession = async (record) => {
      saved.push(record);
      return saveResult;
    };
    run({ root: {}, storage, search, random: () => 0.99, saveSession, screens, now: () => now });
  });
}

const names = (drawn) => drawn.map((d) => d.name);
const stopAt = (screen) => (name) => name === screen;

test("play flow: quiz, payday, four rooms with a lock each, results, quiz, thanks; the game finishes", async () => {
  const { drawn, saved } = await play({ storage: memoryStorage(), search: "?class=P3-TUE" });
  assert.deepEqual([...new Set(names(drawn))], ["quiz", "payday", "choice", "choiceResult", "lock", "results", "thanks"]);
  assert.deepEqual(drawn.filter((d) => d.name === "lock").map((d) => d.props.state.week), [1, 2, 3, 4]);
  const results = drawn.find((d) => d.name === "results");
  assert.equal(results.props.state.finished, true);
  assert.equal(results.props.state.day, 30);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].studyGroup, "play");
  assert.equal(saved[0].classCode, "P3-TUE");
  assert.equal(saved[0].game.locks.length, 4);
});

test("each week's events, the surprise included, run in day order", async () => {
  const { drawn } = await play({ storage: memoryStorage() });
  for (let week = 1; week <= 4; week++) {
    const room = drawn.filter((d) => d.name === "choice" && d.props.state.week === week).map((d) => d.props.event);
    assert.equal(room.filter((e) => e.surprise).length, 1, `week ${week} has one surprise`);
    assert.ok(room.some((e) => !e.surprise));
    const days = room.map((e) => e.day);
    assert.deepEqual(days, [...days].sort((a, b) => a - b), `week ${week} days ${days}`);
  }
  // random 0.99 picks the last surprise of each pool; at least one of them is not the week's last day.
  const late = events.filter((e) => e.surprise).some((s) => events.some((e) => e.week === s.week && !e.surprise && e.day > s.day));
  assert.ok(late, "the content has a surprise that falls before a fixed event, so the order is really tested");
});

test("read flow: quiz, reading, quiz, thanks, and no game screen", async () => {
  const { drawn, saved } = await play({ storage: memoryStorage(), search: "?group=read" });
  assert.deepEqual(names(drawn), ["quiz", "reading", "quiz", "thanks"]);
  assert.equal(saved[0].studyGroup, "read");
  assert.equal(saved[0].game, undefined);
});

test("class code is upper-cased with spaces removed, and left out if still invalid", () => {
  assert.equal(newSession("?class=P3-TUE").classCode, "P3-TUE");
  assert.equal(newSession("?class=p3-tue").classCode, "P3-TUE");
  assert.equal(newSession("?class=%20p3%20tue%20").classCode, "P3TUE");
  assert.equal(newSession("?class=much-too-long-code").classCode, undefined);
  assert.equal(newSession("?class=<b>").classCode, undefined);
  assert.equal(newSession("").classCode, undefined);
});

test("autosave: after every screen the session is stored, and a reload in week 2 resumes there", async () => {
  const storage = memoryStorage();
  await play({ storage, stop: stopAt("payday") });
  assert.equal(read(storage).screen, "payday");

  const inWeek2 = (name, props) => name === "choice" && props.state.week === 2 && props.event.surprise;
  const first = await play({ storage, stop: inWeek2 });
  const left = first.drawn.at(-1).props;
  assert.equal(read(storage).screen, "choice");
  assert.deepEqual(read(storage).state, left.state);

  const second = await play({ storage, stop: () => true, now: T0 + HOUR });
  assert.equal(second.drawn[0].name, "choice");
  assert.deepEqual(second.drawn[0].props.state, left.state);
  assert.equal(second.drawn[0].props.event.id, left.event.id);
});

test("a lock's wrong tries are saved as they happen", async () => {
  const storage = memoryStorage();
  await play({ storage, lockWrongTries: 2, stop: (name, props) => name === "choice" && props.state.week === 2 });
  assert.deepEqual(read(storage).state.locks[0], { puzzle: "pay-stub", wrongTries: 2, hintUsed: false });

  // A lock that is left after two wrong tries comes back with them.
  const mid = memoryStorage();
  let saw;
  await play({
    storage: mid,
    lockWrongTries: 2,
    stop: (name, props) => {
      if (name !== "lock") return false;
      props.onTry(recordLockTry(recordLockTry(props.state, props.puzzle.id, false), props.puzzle.id, false));
      return true;
    },
  });
  assert.equal(read(mid).screen, "lock");
  await play({ storage: mid, stop: (name, props) => ((saw = props.state.locks), true) });
  assert.deepEqual(saw, [{ puzzle: "pay-stub", wrongTries: 2, hintUsed: false }]);
});

test("one finished session: a successful save clears the session and shows 'You're finished' on later loads", async () => {
  const storage = memoryStorage();
  const { result } = await play({ storage });
  assert.equal(result.ok, true);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(read(storage, DONE_KEY), { group: "play", at: T0 });

  const later = await play({ storage, stop: () => true, now: T0 + 11 * HOUR });
  assert.deepEqual(names(later.drawn), ["finished"]);

  // "New student on this device" clears it and starts at the first quiz.
  const next = await play({ storage, stop: stopAt("quiz"), now: T0 + 11 * HOUR });
  assert.deepEqual(names(next.drawn), ["finished", "quiz"]);
  assert.equal(storage.getItem(DONE_KEY), null);
});

test("one finished session: after 12 hours the device starts fresh", async () => {
  const storage = memoryStorage();
  await play({ storage });
  const { drawn } = await play({ storage, stop: () => true, now: T0 + 13 * HOUR });
  assert.deepEqual(names(drawn), ["quiz"]);
});

test("a failed save keeps everything: no done mark, and a reload returns to thanks", async () => {
  const storage = memoryStorage();
  const { result } = await play({ storage, saveResult: { ok: false, error: "too many requests" } });
  assert.equal(result.error, "too many requests");
  assert.equal(read(storage).screen, "thanks");
  assert.equal(storage.getItem(DONE_KEY), null);
  const again = await play({ storage, now: T0 + HOUR });
  assert.deepEqual(names(again.drawn), ["thanks"]);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("the link wins: a different group or a save over 3 hours old starts fresh", async () => {
  const storage = memoryStorage();
  await play({ storage, stop: stopAt("payday") });
  const reading = await play({ storage, search: "?group=read", stop: () => true });
  assert.deepEqual(names(reading.drawn), ["quiz"]);

  await play({ storage, stop: stopAt("payday") });
  const stale = await play({ storage, stop: () => true, now: T0 + 3 * HOUR + 1 });
  assert.deepEqual(names(stale.drawn), ["quiz"]);
  const fresh = await play({ storage, stop: stopAt("payday") , now: T0 + 3 * HOUR + 1 });
  assert.equal(names(fresh.drawn).at(-1), "payday");
  const recent = await play({ storage, stop: () => true, now: T0 + 5 * HOUR });
  assert.deepEqual(names(recent.drawn), ["payday"]);
});

test("never stuck: a save from old content or with no state clears itself and starts fresh", async () => {
  const storage = memoryStorage();
  await play({ storage, stop: (name) => name === "choiceResult" });
  const good = read(storage);
  assert.equal(good.screen, "result");

  const cases = {
    "choiceIndex that no longer exists": { ...good, choiceIndex: 9 },
    "no state": { ...good, state: undefined, screen: "choice" },
    "no state on payday": { group: "play", screen: "payday", savedAt: T0 },
    "an event id that no longer exists": { ...good, room: ["no-such-event"], index: 0, screen: "choice" },
    "an unknown screen": { ...good, screen: "bonus-round" },
    "thanks with no answers": { ...good, screen: "thanks", quizAfter: undefined },
  };
  for (const [what, save] of Object.entries(cases)) {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
    const { drawn } = await play({ storage, stop: () => true });
    assert.deepEqual(names(drawn), ["quiz"], what);
    assert.equal(read(storage).screen, "quiz-before", what);
  }

  storage.setItem(STORAGE_KEY, "{not json");
  assert.deepEqual(names((await play({ storage, stop: () => true })).drawn), ["quiz"]);
});

test("storage that throws, or none at all, does not stop the game", async () => {
  assert.equal((await play({ storage: brokenStorage })).saved.length, 1);
  assert.equal((await play({ storage: null, search: "?group=read" })).drawn.at(-1).name, "thanks");
});
