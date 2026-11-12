import { SpeakerHighIcon } from '@phosphor-icons/react';
import { defineTransient } from '../../define';
import { COMPACT_HEIGHT } from '../../metrics';
import type { ActivityViewProps } from '../../types';

/* PLACEHOLDER coalescing alert: showing it again while visible updates the level in place. */

interface VolumeData {
  /** 0 to 1. */
  level: number;
}

function View({ data }: ActivityViewProps<VolumeData>) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 0 10px' }}>
      <SpeakerHighIcon size={18} weight="fill" />
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--island-fill-2)', overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(data.level * 100)}%`, height: '100%', borderRadius: 3, background: 'var(--island-fg)' }} />
      </div>
    </div>
  );
}

export default defineTransient<VolumeData>({
  kind: 'volume',
  title: 'Volume',
  description: 'Level indicator that updates in place.',
  icon: SpeakerHighIcon,
  defaultData: { level: 0.6 },
  view: { size: { width: 220, height: COMPACT_HEIGHT }, Component: View },
  duration: 1600,
  demo: { controls: [{ type: 'range', key: 'level', label: 'Level', min: 0, max: 1, step: 0.05 }] },
});
