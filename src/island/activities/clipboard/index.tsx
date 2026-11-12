import { CheckCircleIcon } from '@phosphor-icons/react';
import { defineTransient } from '../../define';
import { COMPACT_HEIGHT } from '../../metrics';
import type { ActivityViewProps } from '../../types';

/* PLACEHOLDER transient that exercises the alert contract. */

interface ClipboardData {
  label: string;
}

function View({ data }: ActivityViewProps<ClipboardData>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <CheckCircleIcon size={18} weight="fill" />
      {data.label}
    </div>
  );
}

export default defineTransient<ClipboardData>({
  kind: 'clipboard',
  title: 'Clipboard',
  description: 'Confirms that something was copied.',
  icon: CheckCircleIcon,
  defaultData: { label: 'Copied' },
  view: { size: { width: 148, height: COMPACT_HEIGHT }, Component: View },
  duration: 1800,
  demo: { controls: [{ type: 'text', key: 'label', label: 'Label' }] },
});
