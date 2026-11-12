import { Island } from '@/island';

const BACKDROPS: Record<string, string> = {
  light: '#d4d4d8',
  dark: '#1c1c1f',
  white: '#ffffff',
};

/** The island alone on a flat backdrop. `?view=stage&bg=light|dark|white`. */
export function BareStage() {
  const bg = new URLSearchParams(window.location.search).get('bg') ?? 'light';
  return (
    <div
      data-island-stage
      style={{ position: 'relative', width: '100%', height: '100%', background: BACKDROPS[bg] ?? BACKDROPS.light }}
    >
      <Island />
    </div>
  );
}
