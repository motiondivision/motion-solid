import { onFlush, runWithOwner } from 'solid-js'

/**
 * Run `fn` once Solid's pending flush has finished. Unlike `queueMicrotask`, this is ordered
 * after the flush rather than by JS queue position. Registered with no owner so it is valid
 * from cleanups, computations and plain callbacks alike (`onFlush` warns in an owned scope);
 * the callback's own guards decide whether the work still applies.
 */
export function afterFlush(fn: () => void) {
  runWithOwner(null, () => onFlush(fn))
}
