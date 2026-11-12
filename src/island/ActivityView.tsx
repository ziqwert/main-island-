import { useMemo } from 'react';
import { getDefinition } from './definitions';
import type { ResolvedView } from './presentation';
import { useIslandStore } from './store';
import type { ActivityApi, ActivityInstance, Patch } from './types';

/** Actions bound to one instance. Stable across renders for a given id. */
export function useActivityActions(id: string): Pick<ActivityApi, 'update' | 'dismiss' | 'expand' | 'collapse'> {
  return useMemo(() => {
    const store = useIslandStore.getState;
    return {
      update: (patch: Patch<any>) => store().update(id, patch),
      dismiss: () => store().end(id),
      expand: () => store().expand(id),
      collapse: () => store().collapse(),
    };
  }, [id]);
}

/** Renders the component of a resolved view with its props. The shell wraps and positions it. */
export function ActivityView({ view }: { view: ResolvedView }) {
  const { instance, slot, size, Component } = view;
  const actions = useActivityActions(instance.id);
  return (
    <Component id={instance.id} kind={instance.kind} data={instance.data} slot={slot} size={size} {...actions} />
  );
}

function ControllerHost({ instance }: { instance: ActivityInstance }) {
  const actions = useActivityActions(instance.id);
  const Controller = getDefinition(instance.kind).Controller;
  if (!Controller) return null;
  return <Controller id={instance.id} kind={instance.kind} data={instance.data} {...actions} />;
}

/** Mounts the headless controller of every running instance. The shell renders this exactly once. */
export function IslandControllers() {
  const idle = useIslandStore((state) => state.idle);
  const live = useIslandStore((state) => state.live);
  const transient = useIslandStore((state) => state.transient);
  const instances = transient ? [idle, ...live, transient] : [idle, ...live];
  return (
    <>
      {instances.map((instance) => (
        <ControllerHost key={instance.id} instance={instance} />
      ))}
    </>
  );
}
