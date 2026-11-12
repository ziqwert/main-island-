import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { ActivityView, IslandControllers } from '../ActivityView';
import { usePresentation } from '../hooks/usePresentation';
import { BUBBLE_GAP, BUBBLE_SIZE, FLOATING_TOP } from '../metrics';
import { fx, spring, tween } from '../motion/springs';
import { VIEW_STATE } from '../motion/variants';
import { useIslandStore } from '../store';
import css from './Island.module.css';

/*
 * BASELINE SHELL. A deliberately simple, correct implementation of the shell contract so the
 * rest of the system can be built and tested against it. The production morph engine replaces
 * this file; see docs/ARCHITECTURE.md, "Shell".
 */

const viewVariants = {
  [VIEW_STATE.initial]: () => ({ opacity: 0, scale: fx.scale(0.92), filter: fx.blur(6) }),
  [VIEW_STATE.enter]: () => ({
    opacity: 1,
    scale: 1,
    filter: fx.blur(0),
    transition: spring('content', { delay: 0.06 }),
  }),
  [VIEW_STATE.exit]: () => ({
    opacity: 0,
    scale: fx.scale(0.96),
    filter: fx.blur(6),
    transition: tween(0.14),
  }),
};

export function Island() {
  const { mode, main, bubble } = usePresentation();
  const attachment = useIslandStore((state) => state.settings.attachment);
  const timeScale = useIslandStore((state) => state.settings.timeScale);
  const rootRef = useRef<HTMLDivElement>(null);
  const expanded = mode === 'expanded';

  useEffect(() => {
    if (!expanded) return;
    const collapse = () => useIslandStore.getState().collapse();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) collapse();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') collapse();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const floating = attachment === 'floating';
  const { width, height, radius } = main.size;
  const topRadius = floating ? radius : 0;
  // With a bubble the pair is centred, so the main pill shifts left by half the bubble footprint.
  const shift = bubble ? -(BUBBLE_GAP + BUBBLE_SIZE) / 2 : 0;
  const shellTransition = spring(expanded || mode === 'transient' ? 'morph' : 'collapse');

  return (
    <div
      ref={rootRef}
      data-island-root
      data-mode={mode}
      className={css.root}
      style={{ top: floating ? FLOATING_TOP : 0, '--island-time-scale': timeScale } as CSSProperties}
    >
      <IslandControllers />
      <motion.div
        className={css.shell}
        initial={false}
        animate={{
          width,
          height,
          x: shift,
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
        }}
        transition={shellTransition}
        onClick={() => {
          if (mode === 'idle' || mode === 'compact' || mode === 'split') useIslandStore.getState().expand();
        }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={main.key}
            className={css.view}
            style={{ width, height, marginLeft: -width / 2 }}
            variants={viewVariants}
            initial={VIEW_STATE.initial}
            animate={VIEW_STATE.enter}
            exit={VIEW_STATE.exit}
          >
            <ActivityView view={main} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {bubble && (
          <motion.div
            key="bubble"
            className={css.bubble}
            initial={{ opacity: 0, scale: 0.5, x: width / 2 - BUBBLE_SIZE }}
            animate={{ opacity: 1, scale: 1, x: width / 2 + shift + BUBBLE_GAP }}
            exit={{ opacity: 0, scale: 0.5, x: width / 2 - BUBBLE_SIZE }}
            transition={spring('morph')}
            onClick={() => useIslandStore.getState().expand(bubble.instance.id)}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={bubble.key}
                className={css.bubbleView}
                variants={viewVariants}
                initial={VIEW_STATE.initial}
                animate={VIEW_STATE.enter}
                exit={VIEW_STATE.exit}
              >
                <ActivityView view={bubble} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
