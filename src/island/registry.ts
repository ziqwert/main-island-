import { registerDefinition } from './definitions';
import type { ActivityDefinition } from './types';

// Every folder under activities/ registers itself by default exporting a definition from its index file.
const modules = import.meta.glob<{ default?: ActivityDefinition }>('./activities/*/index.{ts,tsx}', {
  eager: true,
});

for (const [path, module] of Object.entries(modules)) {
  const definition = module.default;
  if (!definition?.kind) {
    console.warn(`[island] ${path} has no default exported activity definition`);
    continue;
  }
  registerDefinition(definition);
}
