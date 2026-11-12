import type { LiveActivityDefinition, TransientDefinition } from './types';

export function defineLiveActivity<TData>(
  definition: Omit<LiveActivityDefinition<TData>, 'type'>,
): LiveActivityDefinition<TData> {
  return { type: 'live', ...definition };
}

export function defineTransient<TData>(
  definition: Omit<TransientDefinition<TData>, 'type'>,
): TransientDefinition<TData> {
  return { type: 'transient', ...definition };
}
