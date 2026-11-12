import { Island, listDefinitions, useIslandStore } from '@/island';

/* PLACEHOLDER playground: a stage and one button per activity. Replaced by the real playground. */
export default function Playground() {
  const store = useIslandStore;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', height: '100%' }}>
      <div data-island-stage style={{ position: 'relative', background: '#d4d4d8' }}>
        <Island />
      </div>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, overflow: 'auto' }}>
        {listDefinitions().map((definition) => (
          <button
            key={definition.kind}
            type="button"
            style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--ui-surface-2)', textAlign: 'left' }}
            onClick={() => store.getState().start(definition.kind)}
          >
            {definition.type === 'live' ? 'Start' : 'Show'} {definition.title}
          </button>
        ))}
        <button type="button" onClick={() => store.getState().toggle()}>
          Toggle expanded
        </button>
        <button type="button" onClick={() => store.getState().reset()}>
          Reset
        </button>
      </aside>
    </div>
  );
}
