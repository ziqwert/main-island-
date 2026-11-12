import type { ActivityDefinition } from './types';

/**
 * Definition table. It imports nothing from the activities so the store can depend on it
 * without an import cycle; `registry.ts` fills it at startup.
 */
const definitions = new Map<string, ActivityDefinition>();

/** The built in activity shown when nothing else runs. Its expanded view is the hub. */
export const IDLE_KIND = 'idle';
export const IDLE_ID = 'idle';

export function registerDefinition(definition: ActivityDefinition): void {
  definitions.set(definition.kind, definition);
}

export function hasDefinition(kind: string): boolean {
  return definitions.has(kind);
}

export function getDefinition(kind: string): ActivityDefinition {
  const definition = definitions.get(kind);
  if (!definition) throw new Error(`Unknown island activity "${kind}"`);
  return definition;
}

/** Every startable activity, sorted by title. The idle activity is excluded. */
export function listDefinitions(): ActivityDefinition[] {
  return [...definitions.values()]
    .filter((definition) => definition.kind !== IDLE_KIND)
    .sort((a, b) => a.title.localeCompare(b.title));
}
