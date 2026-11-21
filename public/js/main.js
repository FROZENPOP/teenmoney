import { events } from "./content/events.js";
import { puzzles } from "./content/puzzles.js";
import { applyChoice, nextWeek, pickSurprise, startGame } from "./game/engine.js";
import { questions } from "./quiz/quiz.js";
import { reading } from "./quiz/reading.js";
import { buildSession } from "./quiz/session.js";
import { save } from "./save.js";
import * as choiceResult from "./ui/choice-result.js";
import * as choice from "./ui/choice.js";
import * as finished from "./ui/finished.js";
import * as lock from "./ui/lock.js";
import * as payday from "./ui/payday.js";
import * as quiz from "./ui/quiz.js";
import * as readingScreen from "./ui/reading.js";
import * as results from "./ui/results.js";
import * as thanks from "./ui/thanks.js";

// Autosave rules: ARCHITECTURE.md 3.4.
export const STORAGE_KEY = "teenmoney.session.v1";
export const DONE_KEY = "teenmoney.done.v1";
const HOUR = 60 * 60 * 1000;
const SESSION_MAX_AGE = 3 * HOUR;
const DONE_MAX_AGE = 12 * HOUR;
const CLASS_CODE = /^[A-Z0-9-]{1,12}$/;
const GAME_SCREENS = ["payday", "choice", "result", "lock", "results"];

const groupOf = (search) => (new URLSearchParams(search).get("group") === "read" ? "read" : "play");

// A fresh session from the URL. The class code is upper-cased without spaces, and left out if still invalid.
export function newSession(search) {
  const classCode = (new URLSearchParams(search).get("class") ?? "").toUpperCase().replace(/\s+/g, "");
  return { group: groupOf(search), classCode: CLASS_CODE.test(classCode) ? classCode : undefined, screen: "quiz-before" };
}

// Storage that is full, blocked or missing never stops the game.
const get = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};
const put = (storage, key, value) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Carry on without autosave.
  }
};
const remove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // Same as above.
  }
};

// Where to start on load: "You're finished" for a recent finished student, else the saved session if it belongs to
// this link and is under 3 hours old, else a fresh one.
export function restore(storage, search, now) {
  const done = get(storage, DONE_KEY);
  if (done && now - done.at < DONE_MAX_AGE) return { group: done.group, screen: "finished" };
  const saved = get(storage, STORAGE_KEY);
  if (saved?.screen && saved.group === groupOf(search) && now - saved.savedAt < SESSION_MAX_AGE) return saved;
  remove(storage, STORAGE_KEY);
  return newSession(search);
}

const eventById = (id) => {
  const event = events.find((e) => e.id === id);
  if (!event) throw new Error(`no event "${id}"`);
  return event;
};

// Starts the current week's room: its fixed events and one surprise (when the week has any), in day order.
function enterRoom(session, random) {
  const { week } = session.state;
  const fixed = events.filter((event) => event.week === week && !event.surprise);
  const surprises = events.some((event) => event.week === week && event.surprise) ? [pickSurprise(events, week, random)] : [];
  const room = [...fixed, ...surprises].sort((a, b) => a.day - b.day).map((event) => event.id);
  return afterEvents({ ...session, room, index: 0 }, 0, random);
}

// Moves to event `index` of the room, or to the lock once the events are done.
function afterEvents(session, index, random) {
  if (index < session.room.length) return { ...session, index, screen: "choice" };
  return puzzles.some((puzzle) => puzzle.week === session.state.week) ? { ...session, screen: "lock" } : leaveRoom(session, session.state, random);
}

function leaveRoom(session, state, random) {
  const next = { ...session, state: nextWeek(state), room: [], index: 0 };
  return next.state.finished ? { ...next, screen: "results" } : enterRoom(next, random);
}

// Draws session.screen and resolves with the session for the next screen. `keep(session)` saves progress mid-screen.
async function step(session, { screens, ask, keep, random, saveSession, storage, search, now }) {
  const { state } = session;
  if (!state && (GAME_SCREENS.includes(session.screen) || (session.screen === "thanks" && session.group === "play"))) {
    throw new Error(`saved "${session.screen}" has no game state`);
  }
  if (session.screen === "thanks" && !(session.quizBefore && session.quizAfter)) throw new Error("saved thanks has no answers");
  const event = ["choice", "result"].includes(session.screen) ? eventById(session.room[session.index]) : null;
  switch (session.screen) {
    case "quiz-before": {
      const quizBefore = await ask(screens.quiz, { questions, eyebrow: "Six questions before you start" });
      return session.group === "read"
        ? { ...session, quizBefore, screen: "reading" }
        : { ...session, quizBefore, state: startGame(), screen: "payday" };
    }
    case "payday":
      await ask(screens.payday, { state });
      return enterRoom(session, random);
    case "choice": {
      const choiceIndex = await ask(screens.choice, { state, event });
      const prev = { cash: state.cash, savings: state.savings, mood: state.mood };
      return { ...session, state: applyChoice(state, event, choiceIndex), prev, choiceIndex, screen: "result" };
    }
    case "result":
      if (!event.choices[session.choiceIndex]) throw new Error("saved result no longer matches the content");
      await ask(screens.choiceResult, { state, prev: session.prev, event, choiceIndex: session.choiceIndex });
      return afterEvents(session, session.index + 1, random);
    case "lock": {
      const puzzle = puzzles.find((p) => p.week === state.week);
      const onTry = (tried) => keep({ ...session, state: tried });
      return leaveRoom(session, await ask(screens.lock, { state, puzzle, onTry }), random);
    }
    case "results":
      await ask(screens.results, { state });
      return { ...session, screen: "quiz-after" };
    case "reading":
      await ask(screens.reading, { reading });
      return { ...session, screen: "quiz-after" };
    case "quiz-after": {
      const quizAfter = await ask(screens.quiz, { questions, eyebrow: "Six questions to finish" });
      return { ...session, quizAfter, screen: "thanks" };
    }
    case "thanks": {
      const record = buildSession({
        studyGroup: session.group,
        classCode: session.classCode,
        quizBefore: session.quizBefore,
        quizAfter: session.quizAfter,
        state,
      });
      // Never resolves: the study build has no replay. A failed save keeps everything; "Try again" retries.
      return ask(screens.thanks, {
        questions,
        quizBefore: session.quizBefore,
        quizAfter: session.quizAfter,
        save: async () => {
          const result = await saveSession(record);
          if (result.ok) {
            remove(storage, STORAGE_KEY);
            put(storage, DONE_KEY, { group: session.group, at: now() });
          }
          return result;
        },
      });
    }
    case "finished":
      await ask(screens.finished, {});
      remove(storage, DONE_KEY);
      return newSession(search);
    default:
      throw new Error(`unknown screen "${session.screen}"`);
  }
}

const SCREEN_MODULES = { quiz, payday, choice, choiceResult, lock, results, reading: readingScreen, thanks, finished };

// Runs the session for ever: restore or start, autosave before each screen, and start fresh after any throw.
export async function run({
  root,
  storage,
  search,
  random = Math.random,
  saveSession = save,
  screens = SCREEN_MODULES,
  now = Date.now,
}) {
  const ask = (module, props) => new Promise((resolve) => module.render(root, props, resolve));
  const keep = (session) => session.screen !== "finished" && put(storage, STORAGE_KEY, { ...session, savedAt: now() });
  let session = restore(storage, search, now());
  for (;;) {
    try {
      keep(session);
      session = await step(session, { screens, ask, keep, random, saveSession, storage, search, now });
    } catch (error) {
      // A fresh session that throws is a bug, not bad saved data: stop rather than loop.
      if (session.screen === "quiz-before" && !session.quizBefore) throw error;
      remove(storage, STORAGE_KEY);
      session = newSession(search);
    }
  }
}

if (globalThis.document?.getElementById("app")) {
  let storage = null;
  try {
    storage = globalThis.localStorage;
  } catch {
    // Storage is blocked: the game runs without autosave.
  }
  run({ root: document.getElementById("app"), storage, search: location.search });
}
