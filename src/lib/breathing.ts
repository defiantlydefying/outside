export const INHALE_MS = 4_000;
export const EXHALE_MS = 6_000;

export function breathingCue(elapsed: number) {
  const position = Math.max(0, elapsed) % (INHALE_MS + EXHALE_MS);
  const inhale = position < INHALE_MS;
  const phaseTime = inhale ? position : position - INHALE_MS;
  const duration = inhale ? INHALE_MS : EXHALE_MS;
  return { inhale, seconds: Math.max(1, Math.ceil((duration - phaseTime) / 1000)) };
}
