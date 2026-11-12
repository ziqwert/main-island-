import { RecordIcon } from '@phosphor-icons/react';
import { defineLiveActivity } from '../../define';
import { useNow } from '../../hooks/useNow';
import { COMPACT_HEIGHT } from '../../metrics';
import type { ActivityViewProps } from '../../types';

/* PLACEHOLDER second live activity, so that split mode can be exercised. */

interface RecordingData {
  startedAt: number;
}

function elapsed(data: RecordingData, now: number): string {
  const total = Math.max(0, Math.floor((now - data.startedAt) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const dot = <RecordIcon size={18} weight="fill" color="var(--island-negative)" />;

function Compact({ data }: ActivityViewProps<RecordingData>) {
  const now = useNow(500);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px 0 9px',
        fontSize: 15,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {dot}
      {elapsed(data, now)}
    </div>
  );
}

function Minimal() {
  return <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>{dot}</div>;
}

function Expanded({ data, dismiss }: ActivityViewProps<RecordingData>) {
  const now = useNow(500);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 24px',
        fontSize: 22,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {dot}
        {elapsed(data, now)}
      </span>
      <button
        type="button"
        onClick={dismiss}
        style={{ height: 36, padding: '0 14px', borderRadius: 18, background: 'var(--island-fill-2)', fontSize: 13, fontWeight: 600 }}
      >
        Stop
      </button>
    </div>
  );
}

export default defineLiveActivity<RecordingData>({
  kind: 'recording',
  title: 'Screen Recording',
  description: 'Elapsed time with a stop control.',
  icon: RecordIcon,
  defaultData: () => ({ startedAt: Date.now() }),
  compact: { size: { width: 124, height: COMPACT_HEIGHT }, Component: Compact },
  minimal: Minimal,
  expanded: { size: { width: 300, height: 76 }, Component: Expanded },
});
