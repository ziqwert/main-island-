# Island architecture

Island is a Dynamic Island for Windows. This repository is its animation foundation: the island
itself (`src/island`) and a developer playground around it (`src/playground`) for triggering every
state on a simulated monitor. Real system integrations (media sessions, notifications, a native
window) are hooked up later; nothing in `src/island` may depend on the playground.

The single most important property of this codebase is motion quality. Every state change must be
smooth, interruptible and pixel crisp. When a trade off appears, quality of motion wins.

## Stack

React 19, TypeScript (strict), Vite, [Motion](https://motion.dev) (`motion/react`), zustand,
Phosphor icons, Manrope (self hosted through `@fontsource-variable/manrope`), CSS Modules with
design tokens in `src/styles/tokens.css`. Do not add dependencies.

## Layout and ownership

```
src/island/                 the product
  types.ts define.ts        contracts for activities and views
  definitions.ts registry.ts  definition table, filled from activities/*/index.tsx
  store.ts                  zustand store: running activities, alerts, expansion, settings
  presentation.ts           pure function: store state -> what the island shows
  effects.ts                one shot gestures: bump, shake
  metrics.ts                shared dimensions
  motion/                   springs, easing, variant labels, global motion config
  hooks/                    useNow, usePresentation
  ActivityView.tsx          renders a resolved view; mounts headless controllers
  shell/                    the morphing island itself
  ui/                       primitives used by activity views (digits, rings, waveforms, buttons)
  activities/<kind>/        one folder per activity, default export is its definition
src/playground/             the developer harness: monitor, control panel, scenarios
src/gallery/                gallery of the ui primitives (/?view=gallery)
src/stage/                  bare stage used by the capture tool (/?view=stage)
scripts/capture.mjs         headless Chrome stills and filmstrips
```

Import the island from outside through `@/island` only. Inside `src/island` use relative imports.

## Model

There are two kinds of things the island can show.

A **live activity** runs for a while: music, a timer, a call. It has three presentations:
`compact` (the pill), `minimal` (a 36 px round bubble, used when it is the second activity) and
`expanded` (the large view). One instance per kind.

A **transient** is a momentary alert: volume, charging, a notification. It has a single view,
takes over the whole island, and dismisses itself. Showing the same kind again while it is visible
updates it in place and restarts its timer. Different alerts queue; a queued alert replaces the
current one once that has been visible for at least 700 ms.

`presentation.ts` derives the **presentation** from the store:

| mode        | when                                    | main shape                    | bubble            |
| ----------- | --------------------------------------- | ----------------------------- | ----------------- |
| `idle`      | nothing runs                            | idle activity, compact        | none              |
| `compact`   | one live activity                       | its compact view              | none              |
| `split`     | two or more live activities             | primary activity, compact     | second, minimal   |
| `expanded`  | `expandedId` is set                     | that activity, expanded       | none              |
| `transient` | an alert is showing                     | the alert view                | none              |

The primary activity is the one with the highest `priority`, newest first on ties. The built in
`idle` activity is always underneath: its compact view is the resting island, its expanded view is
the hub. `ResolvedView.key` identifies the content; when it changes, content swaps.

## Writing an activity

Create `src/island/activities/<kind>/index.tsx` and default export a definition. It registers
itself. See `activities/timer` for the shape.

```tsx
export default defineLiveActivity<TimerData>({
  kind: 'timer',
  title: 'Timer',
  icon: TimerIcon,
  defaultData: () => ({ ... }),
  compact: { size: { width: 132, height: COMPACT_HEIGHT }, Component: Compact },
  minimal: Minimal,
  expanded: { size: { width: 320, height: 84 }, Component: Expanded },
  Controller,              // optional headless logic, mounted once per instance
  demo: { presets, controls },   // drives the auto generated playground card
});
```

Rules of the contract:

- **Sizes are declared, not measured.** `size` is an object or a function of `(data, { attachment })`.
  Use even integers. The view receives the resolved `size` and must fill exactly that box
  (`width: 100%; height: 100%` on its root). The box never changes while the view is mounted;
  the shell animates its own shape around it. Changing the returned size morphs the shell.
- **Radius.** `radius` defaults to a pill for short views and to 36 for tall ones.
- **Time is derived.** Store timestamps in data (`endsAt`, `startedAt`, `pausedMs`) and derive what
  is displayed with `useNow(intervalMs)`. Never store ticking values. Logic that must run whichever
  view is visible (auto ending, simulated progress) goes in `Controller`.
- **Views are functional.** Buttons do what they say by calling `update`, `dismiss`, `expand`,
  `collapse`. No dead controls.
- **No store access at module top level** in activity files (import cycles). Inside components
  and handlers it is fine.
- **Demo descriptor.** `demo.presets` are variations to start with; `demo.controls` are live
  controls (`toggle`, `range`, `select`, `text`, `action`) bound to data keys. The playground
  renders them without knowing the activity.
- Everything user facing is in English.

## Shell

`<Island />` renders the presentation at the top centre of its nearest positioned ancestor. It
owns the shape (size, radius, attachment, bubble), the crossfade between views, pointer behaviour
(press, hover, click to expand, click outside and Escape to collapse, holding an alert while
hovered) and the effects (`bump`, `shake`). It renders `<IslandControllers />` once.

Each view is wrapped in a motion element that moves through the variant labels in
`motion/variants.ts` (`initial` -> `enter`, then `exit`). Motion elements inside a view that
declare variants with the same labels animate in lockstep with the swap; this is how content
choreographs with the morph.

## Motion language

All timing comes from `src/island/motion/springs.ts`:

- `spring(name, overrides?)` with presets `morph`, `collapse`, `content`, `snappy`, `gentle`, `bouncy`
- `tween(seconds, { ease, delay })` with `EASE.out | in | inOut | linear`
- `scaled(seconds)` for delays and timeouts that pace animation
- `fx.blur(px)`, `fx.scale(v)`, `fx.offset(px)` which respect the blur setting and reduced motion

Call them when an animation starts (in render, in a variant function, in a handler), never at
module top level: they read the global time scale, which the playground changes for slow motion.
CSS driven loops multiply their duration by `var(--island-time-scale)`.

Springs are the default for anything a user can interrupt. Fixed duration tweens are for exits and
for looping decoration.

## Quality bar

These rules are what "no stutter, no jumps, no blur" means in practice. Treat them as hard rules.

1. **Crisp at rest.** When nothing is animating, no element that contains text or icons may carry
   a `transform`, a `filter` or `will-change`. Animations end on `transform: none` and
   `filter: none`. Rest positions and sizes are whole pixels.
2. **No projection.** Do not use Motion `layout` or `layoutId` inside the island. They animate
   with scale transforms that distort and soften content.
3. **Never scale text far.** Content may scale between 0.9 and 1.1 while fading. Never animate
   `font-size`. Never stretch a text container.
4. **Animate cheap properties.** Transform, opacity, filter, clip-path and SVG geometry. Size
   properties only on leaf elements with no text. Never `transition: all`.
5. **Everything is interruptible.** Any animation can be retargeted mid flight and must continue
   from its current value and velocity. Never sequence with timeouts that assume a previous
   animation finished. Never derive state from `onAnimationComplete`.
6. **No layout shift from changing values.** Changing numbers sit in fixed width cells with
   `font-variant-numeric: tabular-nums`. Text that can change length has a reserved box.
7. **Rapid input is safe.** Fifty state changes in a second must leave the island in the correct
   final state with no stuck, duplicated or invisible content.
8. **Reduced motion.** With reduced motion in effect, keep fades and drop travel, scale and
   overshoot (`fx.*` and `spring()` already do this when used).
9. **Loops are cheap.** Waveforms, pulses and spinners animate transform and opacity only and stop
   when their view is not present.

## Visual language

Restrained, minimal, black and white.

- **Type.** Manrope. 500 for secondary text, 600 for labels, 700 for emphasis and digits. Sizes
  from the `--island-text-*` tokens. Letter spacing -0.01em from 15 px, -0.02em from 22 px.
  Micro labels: 11 px, 700, uppercase, +0.06em, `--island-fg-3`.
- **Colour.** White on black. Hierarchy through `--island-fg`, `-2`, `-3`, `-4` and surfaces
  through `--island-fill-1..3`. The accents `--island-positive`, `--island-negative`,
  `--island-warning` carry meaning only (accept, decline, recording, low battery) and only on
  small areas: a dot, a glyph, one round button.
- **Icons.** Phosphor, imported with the `Icon` suffix (`PlayIcon`). `weight="fill"` for state
  glyphs and primary controls, `weight="bold"` for small secondary affordances. Sizes 16, 18, 20,
  24. No other weights.
- **Spacing.** 4 px grid, 2 px for optical alignment. In a 36 px pill an 18 px glyph sits 9 px
  from the edge so it is concentric with the cap. Expanded views pad 16 to 20 px; nested radii
  are concentric (inner = outer - padding).
- **Compact grammar.** A leading element on the left, a trailing element on the right, nothing in
  the middle. 120 to 220 px wide, 36 px tall.
- **Controls.** Round icon buttons of 36 or 44 px, `--island-fill-1` at rest, `--island-fill-2`
  on hover, a quick spring to 0.92 while pressed.

## Tooling

```
npm run dev         playground at http://localhost:5173
npm run typecheck   tsc
npm run lint        eslint
npm run test        vitest
npm run build       production build
npm run capture     headless stills and filmstrips, see below
```

`window.__island` drives the island from the console and from the capture tool:
`start(kind, data)`, `update(idOrKind, patch)`, `end(idOrKind)`, `show(kind, data)`, `dismiss()`,
`expand(idOrKind)`, `collapse()`, `toggle()`, `setSettings(patch)`, `reset()`, `effect(name)`,
`kinds()`, `state`.

`scripts/capture.mjs` renders in headless Chrome so that changes can be looked at, including the
middle of a transition. It starts its own server.

```
# a still of a state
npm run capture -- --before "island.start('timer')" --run "island.expand()" --out captures/a.png

# a filmstrip of a transition, slowed down 8 times
npm run capture -- --before "island.start('timer')" --run "island.expand()" \
  --frames 12 --interval 400 --timescale 8 --region 480x220 --out captures/b.png

# many shots in one browser session
npm run capture -- --spec shots.json --outdir captures
```

`npm run capture -- --help` lists every option, including pointer scripting (`--mouse`), settings
(`--set`), other pages (`--path "/?view=gallery" --clip full`) and the dark backdrop
(`--path "/?view=stage&bg=dark"`). `captures/` is git ignored.
