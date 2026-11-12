import { lazy, Suspense } from 'react';
import { BareStage } from './stage/BareStage';

const Playground = lazy(() => import('./playground/Playground'));
const Gallery = lazy(() => import('./gallery/Gallery'));

/**
 * Entry routing by query string:
 *   /                the motion playground (monitor + control panel)
 *   /?view=stage     only the island on a plain backdrop, used by scripts/capture.mjs
 *   /?view=gallery   the UI primitives gallery
 */
export function App() {
  const view = new URLSearchParams(window.location.search).get('view');

  if (view === 'stage') return <BareStage />;

  return <Suspense fallback={null}>{view === 'gallery' ? <Gallery /> : <Playground />}</Suspense>;
}
