import { useEffect, useState } from 'react';

/**
 * Current wall clock time, refreshed every `intervalMs`. Derive countdowns, elapsed times and
 * playback positions from timestamps in activity data plus this value instead of storing ticks.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);

  return now;
}
