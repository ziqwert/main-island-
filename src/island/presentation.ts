import type { ComponentType } from 'react';
import { getDefinition, IDLE_ID, IDLE_KIND } from './definitions';
import { BUBBLE_SIZE, EXPANDED_RADIUS, MAX_SIZE, MIN_SIZE } from './metrics';
import type {
  ActivityDefinition,
  ActivityInstance,
  ActivityViewProps,
  Attachment,
  ResolvedSize,
  SizeContext,
  SizeSpec,
  ViewSlot,
} from './types';

export interface ResolvedView {
  /** Stable identity of this view of this instance. Changes whenever the content must swap. */
  key: string;
  slot: ViewSlot;
  instance: ActivityInstance;
  definition: ActivityDefinition;
  size: ResolvedSize;
  Component: ComponentType<ActivityViewProps>;
}

export type PresentationMode = 'idle' | 'compact' | 'split' | 'expanded' | 'transient';

/** What the island shows right now: one main shape and, when two activities run, a bubble. */
export interface Presentation {
  mode: PresentationMode;
  main: ResolvedView;
  bubble: ResolvedView | null;
}

export interface PresentationInput {
  /** The idle activity with its current data. Defaults to an empty one. */
  idle?: ActivityInstance;
  live: ActivityInstance[];
  transient: ActivityInstance | null;
  expandedId: string | null;
  attachment: Attachment;
}

type Lookup = (kind: string) => ActivityDefinition;

export const IDLE_INSTANCE: ActivityInstance = Object.freeze({
  id: IDLE_ID,
  kind: IDLE_KIND,
  type: 'live',
  data: {},
  startedAt: 0,
  order: 0,
  revision: 0,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
// Even sizes keep both edges of a centred box on whole pixels.
const toEven = (value: number) => 2 * Math.round(value / 2);

export function resolveSize<TData>(spec: SizeSpec<TData>, data: TData, ctx: SizeContext): ResolvedSize {
  const raw = typeof spec === 'function' ? spec(data, ctx) : spec;
  const width = toEven(clamp(raw.width, MIN_SIZE.width, MAX_SIZE.width));
  const height = toEven(clamp(raw.height, MIN_SIZE.height, MAX_SIZE.height));
  const radius = Math.min(raw.radius ?? EXPANDED_RADIUS, width / 2, height / 2);
  return { width, height, radius };
}

/** Highest priority first, newest first within the same priority. */
export function sortLive(live: ActivityInstance[], lookup: Lookup = getDefinition): ActivityInstance[] {
  const priority = (instance: ActivityInstance) => {
    const definition = lookup(instance.kind);
    return definition.type === 'live' ? (definition.priority ?? 0) : 0;
  };
  return [...live].sort((a, b) => priority(b) - priority(a) || b.order - a.order);
}

export function resolvePresentation(input: PresentationInput, lookup: Lookup = getDefinition): Presentation {
  const ctx: SizeContext = { attachment: input.attachment };
  const idle = input.idle ?? IDLE_INSTANCE;

  const view = (instance: ActivityInstance, slot: ViewSlot): ResolvedView => {
    const definition = lookup(instance.kind);
    const base = { instance, definition };
    if (definition.type === 'transient') {
      return {
        ...base,
        key: `${instance.id}:transient`,
        slot: 'transient',
        size: resolveSize(definition.view.size, instance.data, ctx),
        Component: definition.view.Component,
      };
    }
    if (slot === 'minimal') {
      return {
        ...base,
        key: `${instance.id}:minimal`,
        slot,
        size: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, radius: BUBBLE_SIZE / 2 },
        Component: definition.minimal,
      };
    }
    const chosen = slot === 'expanded' ? definition.expanded : definition.compact;
    return {
      ...base,
      key: `${instance.id}:${slot === 'expanded' ? 'expanded' : 'compact'}`,
      slot: slot === 'expanded' ? 'expanded' : 'compact',
      size: resolveSize(chosen.size, instance.data, ctx),
      Component: chosen.Component,
    };
  };

  if (input.transient) {
    return { mode: 'transient', main: view(input.transient, 'transient'), bubble: null };
  }

  const ordered = sortLive(input.live, lookup);

  if (input.expandedId) {
    const target =
      input.expandedId === IDLE_ID ? idle : ordered.find((a) => a.id === input.expandedId);
    if (target) return { mode: 'expanded', main: view(target, 'expanded'), bubble: null };
  }

  if (ordered.length === 0) {
    return { mode: 'idle', main: view(idle, 'compact'), bubble: null };
  }

  return {
    mode: ordered.length > 1 ? 'split' : 'compact',
    main: view(ordered[0], 'compact'),
    bubble: ordered.length > 1 ? view(ordered[1], 'minimal') : null,
  };
}
