/**
 * Haiku has no server-side refusal fallback; larger models re-run a declined
 * request on another model.
 */
export function fallbackParams(model: string) {
  return model.startsWith("claude-haiku")
    ? {}
    : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };
}
