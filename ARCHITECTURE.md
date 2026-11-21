# TeenMoney: Can You Survive 30 Days on Your First Paycheck?

Status: draft 4, 21 Nov 2026. This is the contract for the build. Builders follow it; only the architect changes it.

| Decision | Answer |
|---|---|
| Escape room | Real puzzles: one lock per weekly room |
| Measuring | Quiz inside the site, before and after, saved to a database |
| Permission to save anonymous answers | Approved by the school |
| Comparison group | Yes, if a second class is free: quiz, reading, quiz |
| Look | Paycheck and receipt |
| Scoring | Money and mood |
| Job | Same job and paycheck for everyone |
| Devices | Chromebooks and phones |
| Quiz questions | Claude drafts, Shreyas reviews |
| Hosting | Cloudflare (Worker with static assets) |
| Saved results | Cloudflare D1 |
| Code | Private GitHub repo `FROZENPOP/teenmoney` |
| Build mode | Solid: every PR reviewed against this document |
| Deadline | Ready to test by 5 Dec 2026 |

## 1. What it is

A website where a teenager gets a pretend first paycheck and has to make it last 30 days. They choose how to spend, save and pay for needs, get hit with surprises, and solve a money puzzle to get out of each week. Each choice changes their balance, and they see the result right away.

- **Audience:** high school students, first tested at Creekside High School.
- **Where it's played:** school Chromebooks and phones, in a browser, no install, no login.
- **Length of one session:** about 20 minutes: 2 for the quiz before, 15 for the game, 2 for the quiz after.
- **Success:** students who play improve more on the quiz than students who only read about the same topics.

## 2. How the game works

### The session

Play group (default link):

```
quiz before -> payday -> room 1 -> room 2 -> room 3 -> room 4 -> results -> quiz after -> thanks
```

Reading group (`?group=read`):

```
quiz before -> reading -> quiz after -> thanks
```

A class code can be added to either link (`?class=P3-TUE`). The finished session is saved once, on reaching "thanks".

### The four rooms

Each room is: two or three spending choices, one surprise, then the lock on the door.

| Week | Room | Choices and surprise | The lock |
|---|---|---|---|
| 1 | Payday | Split the paycheck into needs, wants, savings. A friend invites you to a concert. | **Read the pay stub** (`code`). The door code is the total taken out of your pay, added up from the deductions on the stub. (Not take-home pay: the check and the cash meter already show that.) |
| 2 | Bills | Phone bill and transport come due. Your phone screen cracks. | **Find the fee** (`spot`). A bank statement has one charge that shouldn't be there. Tap it. |
| 3 | Temptation | The thing you've wanted goes on sale. A "buy now, pay later" offer appears. | **True cost** (`code`). Two ways to pay for the same item. Enter how much more the pay-later plan costs. |
| 4 | The squeeze | Your hours get cut. A group gift is due. | **Close the gap** (`pick`). You're short for the last week. Choose the set of cuts and extra shifts that reaches day 30 at $0 or better. |

The pay stub and the true-cost checkout are the player's own. The week 2 statement and the week 4 shortfall are presented as an example about a coworker, Jordan, because their numbers cannot match every player's month; the prompts say so. Every document that names the employer says "Blend Street Smoothies".

`biggestHit` ignores money moved into savings; it is the largest real cost.

Lock rules:

- A wrong answer can be retried and costs no money. Wrong tries are counted.
- After 2 wrong tries the first hint shows; after 3, the second.
- After 4, a "Show me how" button explains the answer and opens the door. The lock is recorded with `hintUsed: true`.

### Meters

| Meter | Range | Notes |
|---|---|---|
| Cash | any, in cents | Below 0 means the player has borrowed. Each week change charges a fee of 10% of the amount below zero. |
| Savings | 0 or more, in cents | Can be spent by choices that say so. |
| Mood | 0 to 10 | Starts at 5. Clamped to the range. |

### Starting numbers

Placeholders to tune in the pilot. All money is stored in whole cents.

- Job: smoothie shop, $12.00/hour, 15 hours/week, 60 hours in the month. Gross $720.00.
- Deductions on the stub: federal tax $43.00 (placeholder, check before the test), Social Security 6.2% = $44.64, Medicare 1.45% = $10.44. Take-home **$621.92**.
- Fixed costs: lunches $20 and transport $15 at the end of every week, phone $45 at the end of week 2. $185 over the month.
- Surprise sizes: $40 to $250.

### Endings

Worked out on day 30 from `cash + savings` and `mood`:

| Ending | Rule |
|---|---|
| `broke` | cash + savings below $0 |
| `scraped` | $0 to $49.99, or any amount with mood 2 or lower |
| `made-it` | $50 to $149.99, mood 3 or higher |
| `cushion` | $150 or more, mood 3 or higher |

### The quiz

Six multiple-choice questions, the same before and after. No feedback is shown until the "thanks" screen.

1. Gross pay versus take-home pay (room 1)
2. Needs versus wants (room 1)
3. Spotting a charge you didn't agree to (room 2)
4. What an emergency fund is for (room 2)
5. The real cost of "buy now, pay later" (room 3)
6. What to do when income drops (room 4)

The reading for the comparison group is one page of plain text covering the same six ideas, about 600 words.

## 3. Components

No framework and no build step. The browser loads ES modules directly; Node runs the same modules in tests.

```
public/                 everything the browser gets
  index.html            the single page
  css/                  tokens.css, base.css, screens.css
  fonts/                self-hosted woff2 files
  js/
    main.js             controller: reads the URL, moves between screens, autosaves
    game/               the rules, pure functions, no DOM
    content/            events.js, puzzles.js (data only)
    quiz/               quiz.js, reading.js (data), session.js (builds the saved record)
    ui/                 one module per screen: draws it, reports what the player did
    save.js             sends the finished session
worker/
  index.js              the Cloudflare Worker: one endpoint
  schema.sql            the D1 table
design/                 static mockups of every screen, using the real css/
tests/                  mirrors the folders above
package.json            architect-owned
wrangler.jsonc          architect-owned
```

### 3.1 Game rules: `public/js/game/engine.js`

Pure functions. They never touch the DOM, storage, the clock or `Math.random` (randomness is passed in). They never mutate their arguments.

```js
startGame()                                -> state
applyChoice(state, event, choiceIndex)     -> state
checkLock(puzzle, input)                   -> boolean
recordLockTry(state, puzzleId, correct)    -> state   // counts wrong tries, sets hintUsed at 4
hintsToShow(state, puzzle)                 -> string[] // per the lock rules
nextWeek(state)                            -> state   // fixed costs, loan repayment, week + 1
pickSurprise(events, week, random)         -> event   // random is a function returning 0..1
ending(state)                              -> "broke" | "scraped" | "made-it" | "cushion"
biggestHit(state)                          -> log entry with the largest cash loss
formatMoney(cents)                         -> "$412.50", "-$120.00"
```

Invalid input (unknown choice index, a choice whose `requires` is not met, a finished state) throws an `Error` with a message that names the problem.

Time: week 1 is days 1-7, week 2 is 8-14, week 3 is 15-21, week 4 is 22-30. Every event carries a `day`; `applyChoice` sets `state.day` to it.

`nextWeek` does these in order, adding a log entry for each charge so the receipt shows it:

1. If cash is below 0, charge a borrowing fee of 10% of the amount below zero, rounded to the nearest cent.
2. Charge lunches $20.00 and transport $15.00.
3. When leaving week 2, also charge the phone bill $45.00.
4. Move to the first day of the next week. When leaving week 4, set `day: 30` and `finished: true` instead.

```js
state = {
  day: 1,              // 1..30
  week: 1,             // 1..4
  cash: 62192,         // cents
  savings: 0,          // cents
  mood: 5,             // 0..10
  flags: [],           // e.g. "phone-cracked"
  log: [],             // { week, event, choice, label, cash, savings, mood }
  locks: [],           // { puzzle, wrongTries, hintUsed }
  finished: false      // true after the last nextWeek
}
```

### 3.2 Content: `public/js/content/`

Data only, exported as arrays. Ids are kebab-case and never reused.

```js
// events.js
event = {
  id: "broken-phone",
  week: 2,
  day: 9,
  surprise: true,                 // true = drawn from the week's surprise pool
  title: "Your phone screen cracks",
  body: "It still turns on, but half the screen is dead.",
  choices: [
    { label: "Fix it now",       cash: -12000, mood: 1,  result: "Fixed. That hurt." },
    { label: "Live with it",     mood: -2, flag: "phone-cracked", result: "..." },
    { label: "Use your savings", savings: -12000, requires: { savings: 12000 }, result: "This is what savings are for." }
  ]
}

// puzzles.js
puzzle = {
  id: "pay-stub",
  week: 1,
  kind: "code",                   // "code" | "spot" | "pick"
  prompt: "The door code is how much was taken out of your pay.",
  document: { ... },              // the lines shown; shape depends on kind
  answer: 9808,                   // code: cents. spot: line id. pick: sorted array of option ids
  hints: ["Look at the lines with a minus sign.", "Add up all three deductions."],
  explain: "43.00 + 44.64 + 10.44 = 98.08. You earned $720.00 and $621.92 reached you."
}
```

A choice whose `requires` is not met is shown disabled with the reason, not hidden.

Puzzle `document` shapes, by puzzle (set by task `rooms`):

```js
// pay-stub (code): the stub lines
document: { lines: [{ label, amount }] }                       // amount in signed cents
// true-cost (code): two ways to pay, side by side
document: { options: [{ label, lines: [{ label, amount }] }], answerLabel }
// find-the-fee (spot): a bank statement; input is a line id
document: { lines: [{ id, date, description, amount }] }
// close-the-gap (pick): input is an array of option ids; only the exact set opens, in any order
document: { shortfall, options: [{ id, label, amount, mood }] }
```

Any `document` may also carry optional `title` and `meta` strings; a screen shows them when present and leaves the line out when not.

### 3.3 Quiz and session record: `public/js/quiz/`

```js
// quiz.js
question = { id: "net-pay", text: "...", options: ["...", "...", "...", "..."], correct: 1,
             explain: "one sentence shown with the right answer on the thanks screen" }
score(answers)                 -> number of correct answers, 0..6

// reading.js
reading = { title: "...", paragraphs: ["...", ...] }

// session.js
buildSession({ studyGroup, classCode, quizBefore, quizAfter, state }) -> the request body in 3.5
```

### 3.4 Screens: `public/js/ui/` and `main.js`

Each screen module exports one function:

```js
render(root, props, onDone)    // draws into root, calls onDone(result) once
```

`main.js` owns the order of screens, the URL parameters (`group`, `class`), and autosave. Autosave writes the whole session to `localStorage` under the key `teenmoney.session.v1` after every screen, restores it on load, and clears it after a successful save. Storage errors are caught and the game carries on without autosave.

Autosave rules (decided in the pre-launch audit, 21 Nov):

- **Never stuck.** If restoring or running a saved step throws for any reason (old shape, content changed, corrupt data), clear the saved session and start fresh.
- **The link wins.** Start fresh if the saved session's group differs from the link's group, or if it was last saved more than 3 hours ago.
- **Within a week, events run in day order**, the surprise included.
- **A lock's wrong tries are saved as they happen**, so a refresh does not reset them.
- **One finished session per student.** After a successful save, store `teenmoney.done.v1` (`{ group, at }`). On load, if it is set and less than 12 hours old, show a "You're finished" screen instead of a new quiz; that screen has a "New student on this device" button that clears it. There is no "Play again" in the study build. A failed save never clears the session; "Try again" retries it.
- `?class=` is upper-cased with spaces removed before use; if it is still invalid it is left out.
- `hintUsed` means "reached 4 wrong tries, so 'Show me how' was offered", not "clicked it".

The markup and class names for every screen come from `design/`. Screen modules reproduce that markup; they do not invent new structure or styles.

### 3.5 Saving: `public/js/save.js` and `worker/`

```js
save(session) -> Promise<{ ok: true } | { ok: false, error: string }>   // never throws
```

If saving fails, the "thanks" screen says so and offers "Try again". The session stays in `localStorage` until a save succeeds.

The Worker serves the files in `public/` and one endpoint:

```
POST /api/sessions
Content-Type: application/json

{
  "studyGroup": "play" | "read",
  "classCode": "P3-TUE",                 // optional; 1-12 chars of A-Z a-z 0-9 -
  "quizBefore": [0, 2, 1, 3, 0, 1],      // 6 integers 0..3
  "quizAfter":  [1, 2, 1, 3, 2, 1],
  "game": {                              // required for "play", absent for "read"
    "ending": "scraped",
    "finalCash": 3750, "finalSavings": 0, "finalMood": 4,
    "choices": [{ "event": "concert", "choice": 1 }],            // at most 40
    "locks":   [{ "puzzle": "pay-stub", "wrongTries": 1, "hintUsed": false }]   // at most 4
  }
}

201 { "ok": true }
400 { "ok": false, "error": "<what was wrong>" }    body fails validation
405 { "ok": false, "error": "method not allowed" }  anything but POST
413 { "ok": false, "error": "too large" }           body over 8 KB
429 { "ok": false, "error": "too many requests" }   over the per-visitor limit (env.SAVE_LIMIT, 100 per minute)
500 { "ok": false, "error": "could not save" }      database error, details not exposed
```

Rules for the endpoint:

- Every field is validated against the shape above; unknown fields are rejected.
- The id (`crypto.randomUUID()`) and timestamp are made on the server. `created_at` is rounded down to the hour, so finishing order cannot identify a student.
- Rate limit: before reading the body, call `env.SAVE_LIMIT.limit({ key })` with the `cf-connecting-ip` header as the key (or `"unknown"` when absent). This is the one header besides `content-length` and `content-type` the Worker may read; it is used only as the counting key and is never stored or logged.
- SQL uses bound parameters only.
- Nothing about the sender is stored or logged: no IP address, no user agent, no cookies.
- There is no way to read, change or delete sessions through the site. Results are read by Shreyas with `wrangler d1 execute` or the Cloudflare dashboard.

```sql
-- worker/schema.sql
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  class_code    TEXT,
  study_group   TEXT NOT NULL CHECK (study_group IN ('play','read')),
  quiz_before   TEXT NOT NULL,   -- JSON array
  quiz_after    TEXT NOT NULL,   -- JSON array
  ending        TEXT,
  final_cash    INTEGER,
  final_savings INTEGER,
  final_mood    INTEGER,
  choices       TEXT,            -- JSON array
  locks         TEXT             -- JSON array
);
```

### Student data and privacy

The players are minors at a school. The site stores nothing that identifies them: no names, emails or logins. The name typed on the paycheck stays in the browser and is never part of the session record. The page makes no requests to any other site (fonts are self-hosted, no analytics).

### Not building

Logins, a leaderboard, a teacher dashboard, multiplayer, sound, saving half-finished sessions to the server, choosing a job.

## 4. UI

- **Stack:** hand-written HTML and CSS. No component library, no CSS framework.
- **Tokens:** `public/css/tokens.css` is the design system. Every colour, font size, space and radius used anywhere comes from a custom property defined there.
- **Mockups:** `design/` holds a static page per screen built on the real CSS. They are the reference for look and for markup. Shreyas approves them before the screens are wired up.

### Direction

The world of a first job: the paper paycheck, the tear-off stub, the receipt, the bank statement. Each lock is one of those documents, so solving the puzzle is the same skill as reading the real thing.

| Name | Hex | Use |
|---|---|---|
| Safety paper | `#DDEFE3` | Page background, the pale green of a check |
| Paper white | `#FBFDFB` | Documents: the check, the statement, the receipt |
| Ballpoint | `#14233B` | Text and lines |
| Payday green | `#0E8A5F` | Money in, primary button, a lock opening |
| Overdraft red | `#D7263D` | Money out, warnings, balance below zero |
| Highlighter | `#FFE14D` | The one thing to look at right now; marks a found clue |

- **Bricolage Grotesque** for headlines and every dollar amount, with tabular numbers.
- **Atkinson Hyperlegible** for body text and choices.
- Left-aligned, single column, designed at 360px wide first and widened for a 1366px Chromebook.

Ruled out: dark neon "gamer" styling, banking-app rounded cards, padlock-and-stone-wall escape-room art.

### Screens

| Screen | What's on it |
|---|---|
| Quiz | One question at a time, progress shown as "2 of 6". Used before and after. |
| Payday | The paycheck fills the page, made out for the take-home amount, $621.92. Type a name on the "Pay to" line, then "Cash this check" tears the stub off. This is the one large animation. The stub's deductions are not shown here; they are the week 1 lock. |
| Choice | Week and day, the three meters, the event, and each choice with its price on the button. |
| Result of a choice | One line of consequence and the meters reacting, then "Keep going". |
| Lock | The document, the prompt, the input for that kind of lock, "Try the door", hints as they unlock. |
| Results | The month as one long receipt, the ending, the biggest hit, "Finish with 6 questions". |
| Reading | The comparison group's page, then "I've read it". |
| Thanks | Quiz score before and after, the right answers, save status, "Play again". |

```
Choice                                              Lock
+----------------------------------------------+    +----------------------------------------------+
| Week 2 of 4, day 9                           |    | Week 1 door                                  |
| $412.50 cash   $60 saved   Mood: okay        |    | The code is how much was taken out.          |
|                                              |    | +------------------------------------------+ |
| Your phone screen cracks                     |    | | Pay stub                                 | |
| It still turns on, but half the screen is    |    | | Hours 60 x $12.00            $720.00     | |
| dead.                                        |    | | Federal tax                  -$43.00     | |
|                                              |    | | Social Security              -$44.64     | |
| [ Fix it now            -$120 ]              |    | | Medicare                     -$10.44     | |
| [ Live with it             $0 ]              |    | | Total taken out            $ [ _ _ _ ]   | |
| [ Use your savings      -$120 ]              |    | +------------------------------------------+ |
+----------------------------------------------+    | [ Try the door ]                             |
                                                    +----------------------------------------------+
```

### Principles

1. The paycheck is the hero. The tear is the only large animation.
2. Every lock is a real document.
3. Every choice shows its price before you tap it.
4. The balance reacts: the number counts to its new value and flashes green or red.
5. Talk like a friend, not a textbook. "That hurt." beats "This expense exceeded your budget."
6. Colour is never the only signal: amounts always carry + or -, and mood has a word as well as a colour.

## 5. Rules for builders

1. **Money is whole cents.** No floating-point dollars anywhere. Only `formatMoney` turns cents into text.
2. **Names:** files and ids in kebab-case, functions and variables in camelCase, CSS classes in kebab-case prefixed by screen (`lock-document`).
3. **No dependencies** at runtime. `wrangler` is the only dev dependency. Need another? Ask the architect.
4. **No requests to other sites** from the page: no CDNs, no hosted fonts, no analytics.
5. **Errors:** game functions throw `Error` with a clear message. `save` never throws. The Worker answers with the JSON errors in 3.5. The player sees plain words and what to do next, never a stack trace or "undefined".
6. **No debug output** left in: no `console.log`, no commented-out code.
7. **A test for each acceptance criterion** in your brief. Tests use `node --test` and live under `tests/` in the folder matching your code.
8. **No secrets in code.** The site needs none.
9. **Accessibility floor:** every control reachable and usable by keyboard with a visible focus ring; text contrast at least 4.5:1; `prefers-reduced-motion` turns the tear and counting animations into instant changes; inputs have labels.
10. **Stay in your files.** `.claude/owners` lists them. `package.json`, `wrangler.jsonc` and this document belong to the architect.

### Gates

```
npm install       once per checkout
npm test          node --test, every test passes
npm run check     syntax check of every JS file
npm run db:local  creates the sessions table in the local D1 database
npm run dev       wrangler dev, local site and local D1, for manual checks
```

The Worker reaches the database as `env.DB` (set in `wrangler.jsonc`). Worker tests call the Worker's `fetch(request, env)` directly with a stand-in `env.DB`; they do not need wrangler running.

## 6. Tasks

Phase 1 runs two tasks in parallel. `skeleton` merged on 21 Nov and the site is live at https://teenmoney.teenmoney.workers.dev. `measure` and `rooms` do not touch the look, so they start as soon as an agent slot is free; `screens` waits for the mockups to be approved. At most two agents run at once.

The `sessions` table already exists in the live database. A task that needs to change its columns asks the architect first.

| Task | Role | Phase | Owns | Done when |
|---|---|---|---|---|
| `skeleton` | builder | 1 | `public/index.html`, `public/js/**`, `worker/**`, `tests/**` | On `npm run dev`: unstyled room 1 is playable from payday through the pay-stub lock to a results screen, and finishing sends a session that appears as a row in local D1. Engine functions in 3.1 exist with tests. |
| `ui-design` | frontend | 1 | `public/css/**`, `public/fonts/**`, `design/**` | `design/index.html` links to a mockup of each of the eight screens at phone and Chromebook widths, all built from `tokens.css`, passing the accessibility floor. |
| `rooms` | builder | 2 | `public/js/game/**`, `public/js/content/**`, `tests/game/**`, `tests/content/**` | Rooms 2 to 4, all three lock kinds, surprises, loan repayment and the four endings work, each with tests; a scripted play-through reaches every ending. |
| `measure` | backend | 2 | `public/js/quiz/**`, `public/js/save.js`, `worker/**`, `tests/quiz/**`, `tests/worker/**` | The six questions and the reading exist; the endpoint enforces every rule in 3.5 with a test per rule. |
| `screens` | frontend | 2 | `public/index.html`, `public/js/main.js`, `public/js/ui/**`, `tests/ui/**` | Every screen matches its mockup, both flows in section 2 run end to end, autosave survives a refresh, keyboard-only play works. |

The architect puts the site on Cloudflare as soon as `skeleton` merges, so there is a live link from the first week.

## 7. Schedule

| Dates | Work |
|---|---|
| 21-23 Nov | Phase 1: `skeleton` and `ui-design`. First deploy to Cloudflare. Mockups approved. |
| 24-28 Nov | Phase 2: `rooms`, `measure`, `screens`. |
| 29-30 Nov | Quiz questions and reading reviewed by Shreyas. Full run on a phone and a Chromebook. |
| 1-2 Dec | Pilot with three to five students, fix what confuses them. |
| 3-4 Dec | Buffer. |

If it runs behind, cut in this order: the tear animation, the counting balance, random surprises (one fixed surprise per room). The quiz, the four locks and saving are not cut.

## 8. Still needed from Shreyas

1. Sign in to Cloudflare once (`npx wrangler login`) before the first deploy.
2. Approve the mockups when `ui-design` is ready.
3. Review the six quiz questions and the reading.
4. The exact test date, how many classes take part, and class codes if results should be grouped.
