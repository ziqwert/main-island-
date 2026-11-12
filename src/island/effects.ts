/**
 * One shot physical gestures of the whole island, independent of what it shows.
 * `bump` is a small attention nudge, `shake` is a horizontal refusal.
 */
export type IslandEffect = 'bump' | 'shake';

type Listener = (effect: IslandEffect) => void;

const listeners = new Set<Listener>();

export function emitEffect(effect: IslandEffect): void {
  for (const listener of listeners) listener(effect);
}

export function onEffect(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
