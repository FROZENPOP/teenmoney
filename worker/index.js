// One endpoint: POST /api/sessions (ARCHITECTURE.md 3.5). Static files in public/ are served before this runs.
// Nothing about the sender is stored or logged. Headers read: Content-Length, and cf-connecting-ip as the rate-limit key only.

const MAX_BYTES = 8192;
const ENDINGS = ["broke", "scraped", "made-it", "cushion"];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CLASS_CODE = /^[A-Za-z0-9-]{1,12}$/;

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const INSERT = `INSERT INTO sessions
  (id, created_at, class_code, study_group, quiz_before, quiz_after,
   ending, final_cash, final_savings, final_mood, choices, locks)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`;

// Rounded down to the hour, so finishing order cannot identify a student.
const hourNow = () => new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();

// Reads at most MAX_BYTES of the body; returns null as soon as it is longer, without reading the rest.
async function readBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BYTES) {
      reader.cancel().catch(() => {});
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

// Each check takes (value, path, parent) and returns an error naming the field, or null.
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max;
const rule = (ok, text) => (v, path) => (ok(v) ? null : `${path} must be ${text}`);
const kebab = rule((v) => typeof v === "string" && v.length <= 40 && KEBAB.test(v), "kebab-case, at most 40 characters");
const int = (min, max) => rule(isInt(min, max), `an integer from ${min} to ${max}`);

const object = (fields) => (v, path) => {
  if (!isObject(v)) return `${path || "body"} must be an object`;
  const at = (key) => (path ? `${path}.${key}` : key);
  const extra = Object.keys(v).find((key) => !Object.hasOwn(fields, key));
  if (extra !== undefined) return `unknown field ${at(extra)}`;
  for (const [key, check] of Object.entries(fields)) {
    const error = check(v[key], at(key), v);
    if (error) return error;
  }
  return null;
};

const list = (max, item) => (v, path) => {
  if (!Array.isArray(v) || v.length > max) return `${path} must be a list of at most ${max}`;
  for (const [i, entry] of v.entries()) {
    const error = item(entry, `${path}[${i}]`);
    if (error) return error;
  }
  return null;
};

const quizAnswers = rule((v) => Array.isArray(v) && v.length === 6 && v.every(isInt(0, 3)), "6 integers from 0 to 3");

const game = object({
  ending: rule((v) => ENDINGS.includes(v), `one of ${ENDINGS.join(", ")}`),
  finalCash: int(-10000000, 10000000),
  finalSavings: int(-10000000, 10000000),
  finalMood: int(0, 10),
  choices: list(40, object({ event: kebab, choice: int(0, 9) })),
  locks: list(4, object({ puzzle: kebab, wrongTries: int(0, 99), hintUsed: rule((v) => typeof v === "boolean", "true or false") })),
});

const checkSession = object({
  studyGroup: rule((v) => v === "play" || v === "read", '"play" or "read"'),
  classCode: rule((v) => v === undefined || (typeof v === "string" && CLASS_CODE.test(v)), "1 to 12 letters, digits or -"),
  quizBefore: quizAnswers,
  quizAfter: quizAnswers,
  game: (v, path, body) => {
    if (body.studyGroup === "read") return v === undefined ? null : "game must be absent when studyGroup is read";
    return v === undefined ? "game is required when studyGroup is play" : game(v, path);
  },
});

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/sessions") return reply(404, { ok: false, error: "not found" });
    if (request.method !== "POST") return reply(405, { ok: false, error: "method not allowed" });

    // The connecting IP is only the counting key for the limiter; it is never stored or logged.
    if (env.SAVE_LIMIT) {
      const { success } = await env.SAVE_LIMIT.limit({ key: request.headers.get("cf-connecting-ip") ?? "unknown" });
      if (!success) return reply(429, { ok: false, error: "too many requests" });
    }

    const text = await readBody(request);
    if (text === null) return reply(413, { ok: false, error: "too large" });

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return reply(400, { ok: false, error: "body is not JSON" });
    }
    const error = checkSession(body, "");
    if (error) return reply(400, { ok: false, error });

    const { game } = body;
    try {
      await env.DB.prepare(INSERT)
        .bind(
          crypto.randomUUID(),
          hourNow(),
          body.classCode ?? null,
          body.studyGroup,
          JSON.stringify(body.quizBefore),
          JSON.stringify(body.quizAfter),
          game?.ending ?? null,
          game?.finalCash ?? null,
          game?.finalSavings ?? null,
          game?.finalMood ?? null,
          game ? JSON.stringify(game.choices) : null,
          game ? JSON.stringify(game.locks) : null,
        )
        .run();
    } catch {
      return reply(500, { ok: false, error: "could not save" });
    }
    return reply(201, { ok: true });
  },
};
