import { motionConfig } from './config';

/**
 * The motion vocabulary of the island. Every animation takes its timing from here so that the
 * whole island feels like one material and the playground can retune or slow it down globally.
 *
 * Call these helpers when an animation starts (in render, in a variant function or in an event
 * handler), never at module top level, otherwise they miss later changes to the time scale.
 */
export const SPRING_PRESETS = {
  /** Shell growing: expand, alert takeover. */
  morph: { visualDuration: 0.5, bounce: 0.3 },
  /** Shell shrinking back. */
  collapse: { visualDuration: 0.44, bounce: 0.18 },
  /** Content settling into a view. */
  content: { visualDuration: 0.38, bounce: 0.12 },
  /** Press feedback, toggles, icon swaps. */
  snappy: { visualDuration: 0.22, bounce: 0.24 },
  /** Values that should glide: progress, levels. */
  gentle: { visualDuration: 0.8, bounce: 0 },
  /** Attention: bumps, success pops. */
  bouncy: { visualDuration: 0.5, bounce: 0.45 },
} as const;

export type SpringName = keyof typeof SPRING_PRESETS;

export interface SpringTransition {
  type: 'spring';
  visualDuration: number;
  bounce: number;
  delay: number;
}

export interface TweenTransition {
  type: 'tween';
  duration: number;
  ease: readonly [number, number, number, number] | 'linear';
  delay: number;
}

export const EASE = {
  out: [0.22, 1, 0.36, 1],
  in: [0.5, 0, 0.75, 0],
  inOut: [0.65, 0, 0.35, 1],
  linear: 'linear',
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Seconds scaled by the global time scale. Use for delays and timeouts that pace animations. */
export function scaled(seconds: number): number {
  return seconds * motionConfig.timeScale;
}

export function spring(
  name: SpringName,
  overrides: { visualDuration?: number; bounce?: number; delay?: number } = {},
): SpringTransition {
  const preset = SPRING_PRESETS[name];
  const bounce = motionConfig.reduced ? 0 : (overrides.bounce ?? preset.bounce) * motionConfig.bounce;
  return {
    type: 'spring',
    visualDuration: scaled(overrides.visualDuration ?? preset.visualDuration),
    bounce: clamp(bounce, 0, 0.8),
    delay: scaled(overrides.delay ?? 0),
  };
}

export function tween(
  seconds: number,
  options: { ease?: keyof typeof EASE; delay?: number } = {},
): TweenTransition {
  return {
    type: 'tween',
    duration: scaled(seconds),
    ease: EASE[options.ease ?? 'out'],
    delay: scaled(options.delay ?? 0),
  };
}

export const fx = {
  /** Blur filter value that respects the content blur setting. */
  blur(px: number): string {
    return motionConfig.blur && !motionConfig.reduced ? `blur(${px}px)` : 'blur(0px)';
  },
  /** Scale that collapses to 1 under reduced motion. */
  scale(value: number): number {
    return motionConfig.reduced ? 1 : value;
  },
  /** Travel distance in px that collapses to 0 under reduced motion. */
  offset(px: number): number {
    return motionConfig.reduced ? 0 : px;
  },
};
