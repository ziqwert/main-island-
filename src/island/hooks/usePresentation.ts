import { useMemo } from 'react';
import { resolvePresentation, type Presentation } from '../presentation';
import { useIslandStore } from '../store';

/** The presentation derived from the store. Recomputed only when its inputs change. */
export function usePresentation(): Presentation {
  const idle = useIslandStore((state) => state.idle);
  const live = useIslandStore((state) => state.live);
  const transient = useIslandStore((state) => state.transient);
  const expandedId = useIslandStore((state) => state.expandedId);
  const attachment = useIslandStore((state) => state.settings.attachment);

  return useMemo(
    () => resolvePresentation({ idle, live, transient, expandedId, attachment }),
    [idle, live, transient, expandedId, attachment],
  );
}
