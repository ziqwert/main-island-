import { listDefinitions } from './definitions';
import { emitEffect } from './effects';
import { useIslandStore } from './store';

/**
 * Exposes the island on `window.__island` so it can be driven from the browser console and by
 * `scripts/capture.mjs`. Example: `__island.start('timer'); __island.expand()`.
 */
export function installDebugApi(): void {
  const state = useIslandStore.getState;
  const api = {
    store: useIslandStore,
    get state() {
      return state();
    },
    start: (kind: string, data?: object) => state().start(kind, data),
    update: (idOrKind: string, patch: object) => state().update(idOrKind, patch),
    end: (idOrKind: string) => state().end(idOrKind),
    show: (kind: string, data?: object) => state().show(kind, data),
    dismiss: (id?: string) => state().dismissTransient(id),
    expand: (idOrKind?: string) => state().expand(idOrKind),
    collapse: () => state().collapse(),
    toggle: (idOrKind?: string) => state().toggle(idOrKind),
    setSettings: (patch: object) => state().setSettings(patch),
    reset: () => state().reset(),
    effect: emitEffect,
    kinds: () => listDefinitions().map(({ kind, type, title }) => ({ kind, type, title })),
  };
  (window as unknown as { __island: typeof api }).__island = api;
}
