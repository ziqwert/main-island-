import { TimerIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { defineLiveActivity } from '../../define';
import { useNow } from '../../hooks/useNow';
import { COMPACT_HEIGHT } from '../../metrics';
import type { ActivityApi, ActivityViewProps } from '../../types';
import css from './timer.module.css';

/*
 * PLACEHOLDER activity that exercises the live activity contract end to end: timestamps in data,
 * time derived with useNow, a headless Controller, and a demo descriptor for the playground.
 */

interface TimerData {
  durationMs: number;
  /** Wall clock time at which the countdown reaches zero while running. */
  endsAt: number;
  /** Remaining time captured at pause, or null while running. */
  pausedMs: number | null;
}

function remainingMs(data: TimerData, now: number): number {
  return Math.max(0, data.pausedMs ?? data.endsAt - now);
}

function format(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function togglePause(api: Pick<ActivityApi<TimerData>, 'update'>) {
  api.update((data) =>
    data.pausedMs === null
      ? { pausedMs: Math.max(0, data.endsAt - Date.now()) }
      : { pausedMs: null, endsAt: Date.now() + data.pausedMs },
  );
}

function Compact({ data }: ActivityViewProps<TimerData>) {
  const now = useNow(250, data.pausedMs === null);
  return (
    <div className={css.compact}>
      <TimerIcon size={18} weight="fill" />
      <span className={css.digits}>{format(remainingMs(data, now))}</span>
    </div>
  );
}

function Minimal() {
  return (
    <div className={css.minimal}>
      <TimerIcon size={18} weight="fill" />
    </div>
  );
}

function Expanded({ data, update, dismiss }: ActivityViewProps<TimerData>) {
  const now = useNow(250, data.pausedMs === null);
  return (
    <div className={css.expanded}>
      <span className={css.big}>{format(remainingMs(data, now))}</span>
      <div className={css.actions}>
        <button type="button" className={css.button} onClick={() => togglePause({ update })}>
          {data.pausedMs === null ? 'Pause' : 'Resume'}
        </button>
        <button type="button" className={css.button} onClick={dismiss}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Controller({ data, dismiss }: ActivityApi<TimerData>) {
  const now = useNow(250, data.pausedMs === null);
  const finished = remainingMs(data, now) === 0;
  useEffect(() => {
    if (finished) dismiss();
  }, [finished, dismiss]);
  return null;
}

export default defineLiveActivity<TimerData>({
  kind: 'timer',
  title: 'Timer',
  description: 'Countdown with pause and cancel.',
  icon: TimerIcon,
  defaultData: () => ({ durationMs: 5 * 60_000, endsAt: Date.now() + 5 * 60_000, pausedMs: null }),
  compact: { size: { width: 132, height: COMPACT_HEIGHT }, Component: Compact },
  minimal: Minimal,
  expanded: { size: { width: 320, height: 84 }, Component: Expanded },
  Controller,
  demo: {
    presets: [
      { label: '5 min', data: () => ({ durationMs: 300_000, endsAt: Date.now() + 300_000, pausedMs: null }) },
      { label: '10 sec', data: () => ({ durationMs: 10_000, endsAt: Date.now() + 10_000, pausedMs: null }) },
    ],
    controls: [{ type: 'action', label: 'Pause / resume', run: togglePause }],
  },
});
