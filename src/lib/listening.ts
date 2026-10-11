// Level detection is intentionally conservative. Wind can still look like speech;
// the visible Finish reply control is always available on a physical phone.
export type ListeningState = { speechAt: number | null; lastSpeechAt: number | null; floor: number; samples: number };
export const newListeningState = (): ListeningState => ({ speechAt: null, lastSpeechAt: null, floor: -60, samples: 0 });
export function updateListening(state: ListeningState, level: number | undefined, elapsed: number): ListeningState {
  if (level === undefined || !Number.isFinite(level)) return state;
  const next = { ...state };
  if (elapsed < 600) {
    next.floor = Math.min(-45, (next.floor * next.samples + level) / (next.samples + 1));
    next.samples++;
  } else if (level > Math.max(-40, next.floor + 10)) {
    next.speechAt ??= elapsed;
    next.lastSpeechAt = elapsed;
  }
  return next;
}
export function replyFinished(state: ListeningState, elapsed: number) {
  return state.speechAt !== null && state.lastSpeechAt !== null && elapsed - state.speechAt >= 500 && elapsed - state.lastSpeechAt >= 1600;
}
