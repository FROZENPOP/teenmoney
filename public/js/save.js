// Sends the finished session. Never throws.
export async function save(session) {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    if (response.ok) return { ok: true };
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || `the server answered ${response.status}` };
  } catch {
    return { ok: false, error: "could not reach the server" };
  }
}
