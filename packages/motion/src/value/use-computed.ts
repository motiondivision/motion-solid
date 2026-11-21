import type { MotionValue } from 'motion-dom'
import { createCombineMotionValues } from './use-combine-values'

/**
 * Creates a MotionValue from a function. The function is re-run, and the returned
 * MotionValue updated, whenever a Solid signal or a MotionValue it reads changes.
 *
 * ```ts
 * const x = createMotionValue(0)
 * const doubled = createComputedMotionValue(() => x.get() * 2)
 * ```
 *
 * Equivalent of React's internal `useComputed`.
 */
export function createComputedMotionValue<T>(compute: () => T): MotionValue<T> {
  return createCombineMotionValues(compute)
}
