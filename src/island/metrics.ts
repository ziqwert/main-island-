import type { Attachment, Size } from './types';

/** Height of every compact pill and of the idle island. */
export const COMPACT_HEIGHT = 36;

/** Diameter of the secondary bubble and its gap to the main pill. */
export const BUBBLE_SIZE = 36;
export const BUBBLE_GAP = 8;

/** Distance from the top screen edge in floating mode. Notch mode sits at 0. */
export const FLOATING_TOP = 10;

/** Default corner radius for views taller than a pill. */
export const EXPANDED_RADIUS = 36;

export const IDLE_SIZE: Record<Attachment, Size> = {
  notch: { width: 168, height: COMPACT_HEIGHT },
  floating: { width: 120, height: COMPACT_HEIGHT },
};

/** Hard bounds for any view. The shell sizes its drawing canvas from MAX_SIZE. */
export const MIN_SIZE = { width: 36, height: 28 };
export const MAX_SIZE = { width: 640, height: 400 };
