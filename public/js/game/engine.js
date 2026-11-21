// Game rules. Pure functions: no DOM, storage, clock or Math.random. Money is whole cents.

const WEEK_START_DAY = [1, 8, 15, 22];
const LUNCHES = 2000;
const TRANSPORT = 1500;
const PHONE_BILL = 4500;

export function startGame() {
  return { day: 1, week: 1, cash: 62192, savings: 0, mood: 5, flags: [], log: [], locks: [], finished: false };
}

const clampMood = (mood) => Math.min(10, Math.max(0, mood));

const charge = (state, event, label, cents) => ({
  ...state,
  cash: state.cash - cents,
  log: [...state.log, { week: state.week, event, choice: null, label, cash: -cents, savings: 0, mood: 0 }],
});

export function applyChoice(state, event, choiceIndex) {
  if (state.finished) throw new Error("the game is finished; no more choices");
  const choice = event.choices[choiceIndex];
  if (!choice) throw new Error(`event "${event.id}" has no choice ${choiceIndex}`);
  for (const [meter, needed] of Object.entries(choice.requires ?? {})) {
    if (state[meter] < needed) throw new Error(`choice "${choice.label}" needs ${meter} of at least ${needed}`);
  }
  const cash = choice.cash ?? 0;
  const savings = choice.savings ?? 0;
  const mood = choice.mood ?? 0;
  return {
    ...state,
    day: event.day,
    cash: state.cash + cash,
    savings: state.savings + savings,
    mood: clampMood(state.mood + mood),
    flags: choice.flag && !state.flags.includes(choice.flag) ? [...state.flags, choice.flag] : state.flags,
    log: [...state.log, { week: state.week, event: event.id, choice: choiceIndex, label: choice.label, cash, savings, mood }],
  };
}

// code: input is cents. spot: input is a line id. pick: input is an array of option ids, any order.
// pick accepts only the exact answer, not any set that closes the gap: otherwise ticking every option opens the door
// and the lock no longer asks for the cheapest way out.
export function checkLock(puzzle, input) {
  if (puzzle.kind === "code") return Number.isInteger(input) && input === puzzle.answer;
  if (puzzle.kind === "spot") return typeof input === "string" && input === puzzle.answer;
  if (puzzle.kind === "pick") {
    return Array.isArray(input) && input.length === puzzle.answer.length && [...input].sort().every((id, i) => id === puzzle.answer[i]);
  }
  throw new Error(`unknown lock kind "${puzzle.kind}"`);
}

export function recordLockTry(state, puzzleId, correct) {
  const old = state.locks.find((lock) => lock.puzzle === puzzleId) ?? { puzzle: puzzleId, wrongTries: 0, hintUsed: false };
  const wrongTries = old.wrongTries + (correct ? 0 : 1);
  const lock = { puzzle: puzzleId, wrongTries, hintUsed: old.hintUsed || wrongTries >= 4 };
  return { ...state, locks: [...state.locks.filter((l) => l.puzzle !== puzzleId), lock] };
}

export function hintsToShow(state, puzzle) {
  const wrongTries = state.locks.find((lock) => lock.puzzle === puzzle.id)?.wrongTries ?? 0;
  return puzzle.hints.slice(0, wrongTries >= 3 ? 2 : wrongTries >= 2 ? 1 : 0);
}

export function nextWeek(state) {
  if (state.finished) throw new Error("the game is finished; there is no next week");
  let next = state;
  if (next.cash < 0) next = charge(next, "borrowing-fee", "Borrowing fee", Math.round(-next.cash / 10));
  next = charge(next, "lunches", "Lunches", LUNCHES);
  next = charge(next, "transport", "Transport", TRANSPORT);
  if (next.week === 2) next = charge(next, "phone-bill", "Phone bill", PHONE_BILL);
  if (next.week === 4) return { ...next, day: 30, finished: true };
  return { ...next, week: next.week + 1, day: WEEK_START_DAY[next.week] };
}

export function pickSurprise(events, week, random) {
  const pool = events.filter((event) => event.week === week && event.surprise);
  if (pool.length === 0) throw new Error(`no surprise events for week ${week}`);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function ending(state) {
  const total = state.cash + state.savings;
  if (total < 0) return "broke";
  if (total < 5000 || state.mood <= 2) return "scraped";
  if (total < 15000) return "made-it";
  return "cushion";
}

// The entry that cost the most: the drop in cash + savings. Moving cash into savings costs nothing; paying from
// savings counts like paying in cash. Returns null when nothing cost anything.
const realCost = (entry) => entry.cash + (entry.savings ?? 0);
export function biggestHit(state) {
  return state.log.reduce((worst, entry) => (realCost(entry) < (worst ? realCost(worst) : 0) ? entry : worst), null);
}

export function formatMoney(cents) {
  const abs = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
