import { create } from 'zustand';
import { getDefinition, IDLE_ID } from './definitions';
import { motionConfig, setMotionConfig } from './motion/config';
import { sortLive } from './presentation';
import type { ActivityDefinition, ActivityInstance, IslandSettings, Patch } from './types';

export const DEFAULT_SETTINGS: IslandSettings = {
  attachment: 'notch',
  expandTrigger: 'click',
  timeScale: 1,
  bounce: 1,
  contentBlur: true,
  cornerSmoothing: 0.6,
  outline: true,
  shadow: true,
  reducedMotion: 'system',
};

/** A transient stays at least this long before a queued one may replace it. */
const MIN_TRANSIENT_MS = 700;
const DEFAULT_TRANSIENT_MS = 2600;
const MAX_QUEUE = 6;

export interface IslandState {
  /** Running live activities in start order. */
  live: ActivityInstance[];
  /** The alert currently taking over the island. */
  transient: ActivityInstance | null;
  /** Alerts waiting for their turn. */
  queue: ActivityInstance[];
  /** Id of the expanded live activity, IDLE_ID for the hub, or null. */
  expandedId: string | null;
  settings: IslandSettings;
}

export interface IslandActions {
  /** Starts a live activity, or merges `data` into the running one of that kind. Returns its id. */
  start: (kind: string, data?: object) => string;
  /** Patches the data of a live activity or transient, addressed by id or kind. */
  update: (idOrKind: string, patch: Patch<any>) => void;
  /** Ends a live activity or dismisses a transient, addressed by id or kind. */
  end: (idOrKind: string) => void;
  /** Shows a transient alert. Returns its id. */
  show: (kind: string, data?: object) => string;
  dismissTransient: (id?: string) => void;
  /** Pauses the auto dismiss timer, for example while the pointer rests on the alert. */
  holdTransient: (hold: boolean) => void;
  /** Expands an activity by id or kind. Without an argument: the primary activity, else the hub. */
  expand: (idOrKind?: string) => void;
  collapse: () => void;
  toggle: (idOrKind?: string) => void;
  setSettings: (patch: Partial<IslandSettings>) => void;
  /** Ends everything. Settings are kept. */
  reset: () => void;
}

export type IslandStore = IslandState & IslandActions;

let sequence = 0;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let transientShownAt = 0;
let transientHeld = false;

function createInstance(definition: ActivityDefinition, data?: object): ActivityInstance {
  const defaults =
    typeof definition.defaultData === 'function' ? definition.defaultData() : { ...definition.defaultData };
  sequence += 1;
  return {
    id: `${definition.kind}-${sequence}`,
    kind: definition.kind,
    type: definition.type,
    data: { ...defaults, ...data },
    startedAt: Date.now(),
    order: sequence,
    revision: 0,
  };
}

function patched(instance: ActivityInstance, patch: Patch<any>): ActivityInstance {
  const delta = typeof patch === 'function' ? patch(instance.data) : patch;
  return { ...instance, data: { ...instance.data, ...delta }, revision: instance.revision + 1 };
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function syncMotionConfig(settings: IslandSettings): void {
  setMotionConfig({
    timeScale: settings.timeScale,
    bounce: settings.bounce,
    blur: settings.contentBlur,
    reduced:
      settings.reducedMotion === 'always' || (settings.reducedMotion === 'system' && prefersReducedMotion()),
  });
}

syncMotionConfig(DEFAULT_SETTINGS);

export const useIslandStore = create<IslandStore>()((set, get) => {
  const armDismissTimer = () => {
    clearTimeout(dismissTimer);
    const { transient, queue } = get();
    if (!transient || transientHeld) return;

    if (queue.length > 0) {
      const visibleFor = Date.now() - transientShownAt;
      dismissTimer = setTimeout(advance, Math.max(0, MIN_TRANSIENT_MS - visibleFor));
      return;
    }

    const definition = getDefinition(transient.kind);
    const duration =
      definition.type === 'transient'
        ? typeof definition.duration === 'function'
          ? definition.duration(transient.data)
          : (definition.duration ?? DEFAULT_TRANSIENT_MS)
        : DEFAULT_TRANSIENT_MS;
    if (!Number.isFinite(duration)) return;
    // Slow motion stretches the stay as well, otherwise alerts leave before they finish arriving.
    dismissTimer = setTimeout(advance, duration * Math.max(1, motionConfig.timeScale));
  };

  const advance = () => {
    const [next, ...rest] = get().queue;
    transientShownAt = Date.now();
    transientHeld = false;
    set({ transient: next ?? null, queue: rest });
    armDismissTimer();
  };

  const findLive = (idOrKind: string) => {
    const { live } = get();
    return live.find((a) => a.id === idOrKind) ?? live.find((a) => a.kind === idOrKind);
  };

  return {
    live: [],
    transient: null,
    queue: [],
    expandedId: null,
    settings: DEFAULT_SETTINGS,

    start: (kind, data) => {
      const definition = getDefinition(kind);
      if (definition.type !== 'live') return get().show(kind, data);

      const running = get().live.find((a) => a.kind === kind);
      if (running) {
        if (data) get().update(running.id, data);
        return running.id;
      }

      const instance = createInstance(definition, data);
      const startExpanded =
        typeof definition.startExpanded === 'function'
          ? definition.startExpanded(instance.data)
          : definition.startExpanded;
      set((state) => ({
        live: [...state.live, instance],
        // A new activity closes the hub so its compact view is visible.
        expandedId: startExpanded ? instance.id : state.expandedId === IDLE_ID ? null : state.expandedId,
      }));
      return instance.id;
    },

    update: (idOrKind, patch) => {
      const target = findLive(idOrKind);
      if (target) {
        set((state) => ({ live: state.live.map((a) => (a.id === target.id ? patched(a, patch) : a)) }));
        return;
      }
      const { transient } = get();
      if (transient && (transient.id === idOrKind || transient.kind === idOrKind)) {
        set({ transient: patched(transient, patch) });
      }
    },

    end: (idOrKind) => {
      const target = findLive(idOrKind);
      if (target) {
        set((state) => ({
          live: state.live.filter((a) => a.id !== target.id),
          expandedId: state.expandedId === target.id ? null : state.expandedId,
        }));
        return;
      }
      const { transient, queue } = get();
      if (transient && (transient.id === idOrKind || transient.kind === idOrKind)) {
        get().dismissTransient(transient.id);
      } else if (queue.some((q) => q.id === idOrKind || q.kind === idOrKind)) {
        set({ queue: queue.filter((q) => q.id !== idOrKind && q.kind !== idOrKind) });
      }
    },

    show: (kind, data) => {
      const definition = getDefinition(kind);
      if (definition.type !== 'transient') return get().start(kind, data);

      const { transient, queue } = get();
      const coalesce = definition.coalesce !== false;

      if (transient && transient.kind === kind && coalesce) {
        set({ transient: patched(transient, data ?? {}) });
        armDismissTimer();
        return transient.id;
      }

      const instance = createInstance(definition, data);
      if (!transient) {
        transientShownAt = Date.now();
        transientHeld = false;
        set({ transient: instance, expandedId: null });
      } else {
        const waiting = coalesce ? queue.filter((q) => q.kind !== kind) : queue;
        set({ queue: [...waiting, instance].slice(-MAX_QUEUE) });
      }
      armDismissTimer();
      return instance.id;
    },

    dismissTransient: (id) => {
      const { transient, queue } = get();
      if (!transient) return;
      if (id && transient.id !== id) {
        set({ queue: queue.filter((q) => q.id !== id) });
        return;
      }
      advance();
    },

    holdTransient: (hold) => {
      transientHeld = hold;
      armDismissTimer();
    },

    expand: (idOrKind) => {
      const { live } = get();
      const target =
        idOrKind === undefined
          ? (sortLive(live)[0]?.id ?? IDLE_ID)
          : idOrKind === IDLE_ID
            ? IDLE_ID
            : findLive(idOrKind)?.id;
      if (!target) return;
      // Expanding is an explicit request, so pending alerts give way.
      clearTimeout(dismissTimer);
      set({ expandedId: target, transient: null, queue: [] });
    },

    collapse: () => {
      if (get().expandedId !== null) set({ expandedId: null });
    },

    toggle: (idOrKind) => {
      if (get().expandedId !== null) get().collapse();
      else get().expand(idOrKind);
    },

    setSettings: (patch) => {
      set((state) => ({ settings: { ...state.settings, ...patch } }));
      syncMotionConfig(get().settings);
    },

    reset: () => {
      clearTimeout(dismissTimer);
      transientHeld = false;
      set({ live: [], transient: null, queue: [], expandedId: null });
    },
  };
});
