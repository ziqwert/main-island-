import { CircleIcon } from '@phosphor-icons/react';
import { describe, expect, it } from 'vitest';
import { IDLE_ID, IDLE_KIND } from './definitions';
import { resolvePresentation, resolveSize, sortLive } from './presentation';
import type { ActivityDefinition, ActivityInstance } from './types';

const View = () => null;

function live(kind: string, priority = 0): ActivityDefinition {
  return {
    type: 'live',
    kind,
    title: kind,
    icon: CircleIcon,
    priority,
    defaultData: {},
    compact: { size: { width: 120, height: 36 }, Component: View },
    minimal: View,
    expanded: { size: { width: 360, height: 160 }, Component: View },
  };
}

const definitions: Record<string, ActivityDefinition> = {
  [IDLE_KIND]: live(IDLE_KIND),
  music: live('music'),
  call: live('call', 10),
  toast: {
    type: 'transient',
    kind: 'toast',
    title: 'toast',
    icon: CircleIcon,
    defaultData: {},
    view: { size: { width: 200, height: 36 }, Component: View },
  },
};

const lookup = (kind: string) => definitions[kind];

let order = 0;
function instance(kind: string): ActivityInstance {
  order += 1;
  return { id: `${kind}-${order}`, kind, type: definitions[kind].type, data: {}, startedAt: 0, order, revision: 0 };
}

const base = { live: [], transient: null, expandedId: null, attachment: 'notch' as const };

describe('resolvePresentation', () => {
  it('rests in idle when nothing runs', () => {
    const presentation = resolvePresentation(base, lookup);
    expect(presentation.mode).toBe('idle');
    expect(presentation.main.instance.kind).toBe(IDLE_KIND);
    expect(presentation.bubble).toBeNull();
  });

  it('shows one activity compact', () => {
    const presentation = resolvePresentation({ ...base, live: [instance('music')] }, lookup);
    expect(presentation.mode).toBe('compact');
    expect(presentation.main.slot).toBe('compact');
  });

  it('splits two activities, newest in the pill and the other in the bubble', () => {
    const first = instance('music');
    const second = instance('music');
    const presentation = resolvePresentation({ ...base, live: [first, second] }, lookup);
    expect(presentation.mode).toBe('split');
    expect(presentation.main.instance.id).toBe(second.id);
    expect(presentation.bubble?.instance.id).toBe(first.id);
    expect(presentation.bubble?.slot).toBe('minimal');
  });

  it('gives the pill to the higher priority activity regardless of age', () => {
    const call = instance('call');
    const music = instance('music');
    expect(sortLive([call, music], lookup).map((a) => a.kind)).toEqual(['call', 'music']);
  });

  it('expands the requested activity and hides the bubble', () => {
    const music = instance('music');
    const call = instance('call');
    const presentation = resolvePresentation({ ...base, live: [music, call], expandedId: music.id }, lookup);
    expect(presentation.mode).toBe('expanded');
    expect(presentation.main.key).toBe(`${music.id}:expanded`);
    expect(presentation.bubble).toBeNull();
  });

  it('opens the hub when the idle activity is expanded', () => {
    const presentation = resolvePresentation({ ...base, expandedId: IDLE_ID }, lookup);
    expect(presentation.mode).toBe('expanded');
    expect(presentation.main.instance.kind).toBe(IDLE_KIND);
  });

  it('lets a transient take over everything', () => {
    const music = instance('music');
    const presentation = resolvePresentation(
      { ...base, live: [music], expandedId: music.id, transient: instance('toast') },
      lookup,
    );
    expect(presentation.mode).toBe('transient');
    expect(presentation.main.slot).toBe('transient');
  });

  it('falls back to compact when the expanded activity is gone', () => {
    const presentation = resolvePresentation({ ...base, live: [instance('music')], expandedId: 'missing' }, lookup);
    expect(presentation.mode).toBe('compact');
  });
});

describe('resolveSize', () => {
  const ctx = { attachment: 'notch' as const };

  it('rounds to even pixels so centred edges stay on the pixel grid', () => {
    expect(resolveSize({ width: 201, height: 37 }, {}, ctx)).toMatchObject({ width: 202, height: 38 });
  });

  it('defaults to a pill for short views and caps the radius for tall ones', () => {
    expect(resolveSize({ width: 200, height: 36 }, {}, ctx).radius).toBe(18);
    expect(resolveSize({ width: 360, height: 160 }, {}, ctx).radius).toBe(36);
  });

  it('passes data and context to size functions', () => {
    const size = resolveSize((data: { wide: boolean }) => ({ width: data.wide ? 300 : 200, height: 36 }), { wide: true }, ctx);
    expect(size.width).toBe(300);
  });
});
