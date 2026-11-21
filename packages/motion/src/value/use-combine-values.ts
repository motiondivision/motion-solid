import type { MotionValue } from 'motion-dom'
import { cancelFrame, collectMotionValues, frame, motionValue } from 'motion-dom'
import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createRenderEffect } from 'solid-js'

/**
 * Runs `fn` while recording every MotionValue whose `get()` is called.
 * Restores any outer session afterwards so nested collections stay isolated.
 */
function collect<T>(fn: () => T): { result: T, deps: MotionValue[] } {
  const previous = collectMotionValues.current
  const deps: MotionValue[] = []
  collectMotionValues.current = deps
  try {
    return { result: fn(), deps }
  }
  finally {
    collectMotionValues.current = previous
  }
}

/**
 * Creates a MotionValue whose value is `combineValues()`, kept up to date when
 * any of the source MotionValues change.
 *
 * - With `values`, those MotionValues are the sources (an array or an accessor of one).
 * - Without `values`, every MotionValue read through `get()` inside `combineValues` is
 *   collected automatically.
 *
 * Solid signals read inside `combineValues` are tracked as well: when one changes the
 * value is recomputed and the MotionValue subscriptions are rebuilt. MotionValue changes
 * are batched to the next `preRender` step of the Motion frame loop, so several sources
 * changing in one frame cause a single update.
 *
 * Subscriptions are released with the owner.
 */
export function createCombineMotionValues<T>(
  combineValues: () => T,
  values?: MaybeAccessor<MotionValue[]>,
): MotionValue<T> {
  /**
   * Assigned by the render effect below, which runs synchronously on creation, so the
   * MotionValue exists (with the correct initial value) before this function returns.
   * It stays the same MotionValue for the lifetime of the owner.
   */
  let value!: MotionValue<T>

  createRenderEffect(
    () => {
      if (values !== undefined) {
        return { result: combineValues(), deps: access(values) }
      }
      return collect(combineValues)
    },
    ({ result, deps }) => {
      if (value)
        value.set(result)
      else
        value = motionValue(result)

      const target = value
      /**
       * Pre-bound so that whenever a source changes it can be scheduled in the frame
       * loop. If already scheduled it is not fired twice in a single frame.
       */
      const scheduleUpdate = () => frame.preRender(updateValue, false, true)
      const subscribe = (list: MotionValue[]) => list.map(v => v.on('change', scheduleUpdate))
      let current = deps
      let subscriptions = subscribe(current)
      const updateValue = () => {
        if (values !== undefined) {
          target.set(combineValues())
          return
        }
        // Dependencies can differ per run (conditional reads): collect again and resubscribe.
        const next = collect(combineValues)
        target.set(next.result)
        if (next.deps.length !== current.length || next.deps.some((d, i) => d !== current[i])) {
          subscriptions.forEach(unsubscribe => unsubscribe())
          current = next.deps
          subscriptions = subscribe(current)
        }
      }

      return () => {
        subscriptions.forEach(unsubscribe => unsubscribe())
        cancelFrame(updateValue)
      }
    },
  )

  return value
}
