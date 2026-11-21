import { events } from "./content/events.js";
import { puzzles } from "./content/puzzles.js";
import { applyChoice, nextWeek, pickSurprise, startGame } from "./game/engine.js";
import { questions } from "./quiz/quiz.js";
import { reading } from "./quiz/reading.js";
import { buildSession } from "./quiz/session.js";
import { save } from "./save.js";
import * as choiceResult from "./ui/choice-result.js";
import * as choice from "./ui/choice.js";
import * as lock from "./ui/lock.js";
import * as payday from "./ui/payday.js";
import * as quiz from "./ui/quiz.js";
import * as readingScreen from "./ui/reading.js";
import * as results from "./ui/results.js";
import * as thanks from "./ui/thanks.js";

export const STORAGE_KEY = "teenmoney.session.v1";
const SCREENS = ["quiz-before", "payday", "choice", "result", "lock", "results", "reading", "quiz-after", "thanks"];
const CLASS_CODE = /^[A-Za-z0-9-]{1,12}$/;

// A fresh session from the URL. A class code the server would refuse is dropped, so the save still goes through.
export function newSession(search) {
  const params = new URLSearchParams(search);
  const classCode = params.get("class");
  return {
    group: params.get("group") === "read" ? "read" : "play",
    classCode: classCode && CLASS_CODE.test(classCode) ? classCode : undefined,
    screen: "quiz-before",
  };
}

// The saved session, or null when there is none, it can't be read, or it names content that no longer exists.
export function load(storage) {
  try {
    const session = JSON.parse(storage.getItem(STORAGE_KEY));
    const room = session?.room ?? [];
    if (!SCREENS.includes(session?.screen) || !room.every((id) => events.some((event) => event.id === id))) return null;
    return session;
  } catch {
    return null;
  }
}

const write = (storage, session) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage is full or blocked: carry on without autosave.
  }
};

export const clear = (storage) => {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above.
  }
};

const eventById = (id) => events.find((event) => event.id === id);

// Starts the current week's room: its fixed events in day order, then one surprise when the week has any.
function enterRoom(session, random) {
  const { week } = session.state;
  const fixed = events.filter((event) => event.week === week && !event.surprise).sort((a, b) => a.day - b.day);
  const surprises = events.some((event) => event.week === week && event.surprise) ? [pickSurprise(events, week, random)] : [];
  const room = [...fixed, ...surprises].map((event) => event.id);
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

// Draws session.screen and resolves with the session for the next screen.
async function step(session, { screens, ask, random, saveSession, storage, search }) {
  const { state } = session;
  const event = session.room?.length ? eventById(session.room[session.index]) : null;
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
      await ask(screens.choiceResult, { state, prev: session.prev, event, choiceIndex: session.choiceIndex });
      return afterEvents(session, session.index + 1, random);
    case "lock": {
      const puzzle = puzzles.find((p) => p.week === state.week);
      return leaveRoom(session, await ask(screens.lock, { state, puzzle }), random);
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
      await ask(screens.thanks, {
        questions,
        quizBefore: session.quizBefore,
        quizAfter: session.quizAfter,
        playAgain: session.group === "play",
        save: async () => {
          const result = await saveSession(record);
          if (result.ok) clear(storage);
          return result;
        },
      });
      clear(storage);
      return newSession(search);
    }
  }
}

const SCREEN_MODULES = { quiz, payday, choice, choiceResult, lock, results, reading: readingScreen, thanks };

// Runs the session for ever: restore or start, then draw each screen and autosave before it.
export async function run({ root, storage, search, random = Math.random, saveSession = save, screens = SCREEN_MODULES }) {
  const ask = (module, props) => new Promise((resolve) => module.render(root, props, resolve));
  let session = load(storage) ?? newSession(search);
  for (;;) {
    write(storage, session);
    session = await step(session, { screens, ask, random, saveSession, storage, search });
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
