// Minimal metrics shim for counseller's standalone logger.
// In tele, markError feeds an in-process error ring buffer used by the
// /api/metrics endpoint. Counseller's standalone server does not surface this
// (yet); the no-op keeps logger.ts compatible with tele's structure.
export function markError(
  _level: "warn" | "error",
  _msg: string,
  _extra?: Record<string, unknown>
): void {
  // no-op
}
