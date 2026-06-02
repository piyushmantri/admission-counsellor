export function httpError(code: number, message: string) {
  return { statusCode: code, message };
}

// Wrap a Postgres error into an HTTP response envelope.
// Lesson 2026-04-30: catch 23505 (unique-violation) at the route boundary
// and return 409 instead of letting it bubble as 500.
export function wrapPgError(
  err: unknown
): { status: number; body: { error: string } } {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "23505") return { status: 409, body: { error: "Already exists." } };
    if (code === "23503") return { status: 400, body: { error: "Referenced record not found." } };
  }
  throw err;
}
