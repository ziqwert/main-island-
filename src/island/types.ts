import type { Icon } from '@phosphor-icons/react';
import type { ComponentType } from 'react';

/** How the island sits on the screen: flush with the top edge, or a free pill below it. */
export type Attachment = 'notch' | 'floating';

export type ViewSlot = 'compact' | 'minimal' | 'expanded' | 'transient';

/** Size of a view box in CSS px. Use even integers; `radius` defaults to a pill for short views. */
export interface Size {
  width: number;
  height: number;
  radius?: number;
}

export interface ResolvedSize {
  width: number;
  height: number;
  radius: number;
}

export interface SizeContext {
  attachment: Attachment;
}

export type SizeSpec<TData> = Size | ((data: TData, ctx: SizeContext) => Size);

export type Patch<TData> = Partial<TData> | ((prev: TData) => Partial<TData>);

/** Handle on one running activity. Stable for the lifetime of the instance except for `data`. */
export interface ActivityApi<TData = any> {
  id: string;
  kind: string;
  data: TData;
  update: (patch: Patch<TData>) => void;
  /** Ends a live activity or dismisses a transient. */
  dismiss: () => void;
  expand: () => void;
  collapse: () => void;
}

export interface ActivityViewProps<TData = any> extends ActivityApi<TData> {
  slot: ViewSlot;
  /** The box this view is laid out in. It never changes while the view is mounted. */
  size: ResolvedSize;
}

export interface ViewDefinition<TData> {
  size: SizeSpec<TData>;
  Component: ComponentType<ActivityViewProps<TData>>;
}

export type DemoControl<TData> =
  | { type: 'toggle'; key: keyof TData & string; label: string }
  | { type: 'range'; key: keyof TData & string; label: string; min: number; max: number; step?: number; unit?: string }
  | {
      type: 'select';
      key: keyof TData & string;
      label: string;
      options: { label: string; value: string | number | boolean }[];
    }
  | { type: 'text'; key: keyof TData & string; label: string; placeholder?: string }
  | { type: 'action'; label: string; run: (api: ActivityApi<TData>) => void };

export interface DemoPreset<TData> {
  label: string;
  data: Partial<TData> | (() => Partial<TData>);
}

/** Drives the auto generated playground card for an activity. */
export interface DemoDefinition<TData> {
  /** Variations to start the activity with. */
  presets?: DemoPreset<TData>[];
  /** Live controls shown while the activity is running. */
  controls?: DemoControl<TData>[];
}

interface BaseDefinition<TData> {
  /** Unique id, also the folder name under `activities/`. */
  kind: string;
  title: string;
  description?: string;
  icon: Icon;
  defaultData: TData | (() => TData);
  /**
   * Headless logic mounted exactly once while the instance exists, whichever view is visible.
   * Use it for clocks, simulated progress and auto ending.
   */
  Controller?: ComponentType<ActivityApi<TData>>;
  demo?: DemoDefinition<TData>;
}

/** A long running activity with compact, minimal and expanded presentations. */
export interface LiveActivityDefinition<TData = any> extends BaseDefinition<TData> {
  type: 'live';
  /** Higher wins the main pill when several activities run. Ties go to the newest. Default 0. */
  priority?: number;
  compact: ViewDefinition<TData>;
  /** Rendered inside the round bubble when this activity is secondary. */
  minimal: ComponentType<ActivityViewProps<TData>>;
  expanded: ViewDefinition<TData>;
  /** Open expanded as soon as the activity starts, like an incoming call. */
  startExpanded?: boolean | ((data: TData) => boolean);
}

/** A momentary alert that takes over the island and dismisses itself. */
export interface TransientDefinition<TData = any> extends BaseDefinition<TData> {
  type: 'transient';
  view: ViewDefinition<TData>;
  /** Milliseconds on screen. `Infinity` keeps it until dismissed. Default 2600. */
  duration?: number | ((data: TData) => number);
  /** Showing the same kind while visible updates it in place and restarts the timer. Default true. */
  coalesce?: boolean;
}

export type ActivityDefinition<TData = any> = LiveActivityDefinition<TData> | TransientDefinition<TData>;

export interface ActivityInstance<TData = any> {
  id: string;
  kind: string;
  type: 'live' | 'transient';
  data: TData;
  startedAt: number;
  /** Monotonic start order across all instances. */
  order: number;
  /** Increments on every data update. */
  revision: number;
}

export interface IslandSettings {
  attachment: Attachment;
  expandTrigger: 'click' | 'hover';
  /** Duration multiplier for every animation. 1 is realtime, 4 is four times slower. */
  timeScale: number;
  /** Multiplier on the designed spring bounce. 1 is as designed, 0 removes overshoot. */
  bounce: number;
  /** Soft focus crossfade when content swaps. */
  contentBlur: boolean;
  /** Continuous corner smoothing, 0 (circular arcs) to 1. */
  cornerSmoothing: number;
  outline: boolean;
  shadow: boolean;
  reducedMotion: 'system' | 'always' | 'never';
}
