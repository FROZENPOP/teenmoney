// One endpoint: POST /api/sessions. Static files in public/ are served before this runs.
// Field-by-field validation comes with task `measure`. Nothing about the sender is stored or logged.

const MAX_BYTES = 8192;

const reply = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const INSERT = `INSERT INTO sessions
  (id, created_at, class_code, study_group, quiz_before, quiz_after,
   ending, final_cash, final_savings, final_mood, choices, locks)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`;

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/sessions") return reply(404, { ok: false, error: "not found" });
    if (request.method !== "POST") return reply(405, { ok: false, error: "method not allowed" });

    // ponytail: reads the whole body before measuring; measure can check Content-Length first if it matters.
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES) return reply(413, { ok: false, error: "too large" });

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return reply(400, { ok: false, error: "body is not JSON" });
    }
    const missing = ["studyGroup", "quizBefore", "quizAfter"].find((key) => body?.[key] === undefined);
    if (missing) return reply(400, { ok: false, error: `missing ${missing}` });

    const game = body.game;
    try {
      await env.DB.prepare(INSERT)
        .bind(
          crypto.randomUUID(),
          new Date().toISOString(),
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
