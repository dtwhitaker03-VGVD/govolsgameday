import { useSyncExternalStore } from 'react';

// One shared once-a-second clock for every countdown on the page. Each timer
// used to run its own setInterval, started at a different moment, so two
// countdowns for the same game could show seconds a tick apart. Here a single
// timeout chain fires on the wall-clock second boundary and all subscribers
// read the same timestamp, so they always agree.

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  timer = setTimeout(() => {
    now = Date.now();
    listeners.forEach((l) => l());
    schedule();
  }, 1000 - (Date.now() % 1000));
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    now = Date.now();
    schedule();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

/** The current time, updated once per second and identical across all callers. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => now);
}
