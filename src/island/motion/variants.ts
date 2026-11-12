/**
 * Variant labels shared by the shell and by everything inside a view.
 *
 * The shell wraps each view in a motion element that moves through these labels. Any motion
 * element inside the view that declares variants with the same labels is animated in lockstep
 * by Motion's variant propagation, which is how view content choreographs its entrance and exit
 * with the shell morph.
 */
export const VIEW_STATE = {
  initial: 'initial',
  enter: 'enter',
  exit: 'exit',
} as const;

export type ViewState = (typeof VIEW_STATE)[keyof typeof VIEW_STATE];
