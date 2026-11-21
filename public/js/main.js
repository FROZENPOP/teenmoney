import { events } from "./content/events.js";
import { puzzles } from "./content/puzzles.js";
import { nextWeek, pickSurprise, startGame } from "./game/engine.js";
import { questions } from "./quiz/quiz.js";
import { buildSession } from "./quiz/session.js";
import { save } from "./save.js";
import * as choice from "./ui/choice.js";
import * as lock from "./ui/lock.js";
import * as payday from "./ui/payday.js";
import * as quiz from "./ui/quiz.js";
import * as results from "./ui/results.js";
import * as thanks from "./ui/thanks.js";

// ponytail: play group and room 1 only; rooms 2-4, ?group=read and autosave come with later tasks.
const root = document.getElementById("app");
const classCode = new URLSearchParams(location.search).get("class") || undefined;
const screen = (module, props) => new Promise((resolve) => module.render(root, props, resolve));

async function play() {
  const quizBefore = await screen(quiz, { questions, heading: "Before you start" });
  let state = startGame();
  await screen(payday, { state });

  const roomEvents = events.filter((event) => event.week === state.week && !event.surprise);
  for (const event of [...roomEvents, pickSurprise(events, state.week, Math.random)]) {
    state = await screen(choice, { state, event });
  }
  state = await screen(lock, { state, puzzle: puzzles.find((puzzle) => puzzle.week === state.week) });
  state = nextWeek(state);

  await screen(results, { state });
  const quizAfter = await screen(quiz, { questions, heading: "Six questions to finish" });
  const session = buildSession({ studyGroup: "play", classCode, quizBefore, quizAfter, state });
  await screen(thanks, { questions, quizBefore, quizAfter, save: () => save(session) });
  play();
}

play();
