/**
 * Global motion tuning. Kept as a plain mutable object, separate from the store, so motion helpers
 * can be imported anywhere without an import cycle. The store writes settings through to it.
 */
export interface MotionConfig {
  /** Duration multiplier. 1 is realtime. */
  timeScale: number;
  /** Multiplier on designed spring bounce. */
  bounce: number;
  /** Whether content swaps use a blur crossfade. */
  blur: boolean;
  /** Reduced motion is in effect: keep fades, drop travel, scale and overshoot. */
  reduced: boolean;
}

export const motionConfig: MotionConfig = {
  timeScale: 1,
  bounce: 1,
  blur: true,
  reduced: false,
};

export function setMotionConfig(patch: Partial<MotionConfig>): void {
  Object.assign(motionConfig, patch);
}
