import { CircleIcon } from '@phosphor-icons/react';
import { defineLiveActivity } from '../../define';
import { IDLE_KIND } from '../../definitions';
import { IDLE_SIZE } from '../../metrics';
import type { ActivityViewProps } from '../../types';

/*
 * The idle activity is always present underneath everything else. Its compact view is the
 * resting island (empty), its expanded view is the hub.
 * PLACEHOLDER: the hub is implemented later; keep the definition shape.
 */

function IdleCompact() {
  return null;
}

function HubPlaceholder({ size }: ActivityViewProps) {
  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--island-fg-3)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Hub
    </div>
  );
}

export default defineLiveActivity<Record<string, never>>({
  kind: IDLE_KIND,
  title: 'Idle',
  icon: CircleIcon,
  defaultData: {},
  compact: { size: (_data, { attachment }) => IDLE_SIZE[attachment], Component: IdleCompact },
  minimal: IdleCompact,
  expanded: { size: { width: 380, height: 160 }, Component: HubPlaceholder },
});
