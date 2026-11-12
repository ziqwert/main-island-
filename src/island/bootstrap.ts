// Loads every activity definition, then gives the store's idle activity its default data.
// Imported for its side effects by index.ts before anything else.
import './registry';
import { useIslandStore } from './store';

useIslandStore.getState().reset();
