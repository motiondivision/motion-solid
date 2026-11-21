import type { MotionValue, MotionValueEventCallbacks } from 'motion-dom'
import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createRenderEffect } from 'solid-js'

/**
 * Subscribes to an event of a MotionValue for the lifetime of the owner. The listener is
 * attached synchronously (a render effect), so changes made right after setup are seen.
 * If `value` is an accessor, the listener moves to the new MotionValue when it changes.
 *
 * ```ts
 * const x = createMotionValue(0)
 * createMotionValueEvent(x, 'change', latest => console.log(latest))
 * ```
 */
export function createMotionValueEvent<
  V,
  EventName extends keyof MotionValueEventCallbacks<V>,
>(
  value: MaybeAccessor<MotionValue<V>>,
  event: EventName,
  callback: MotionValueEventCallbacks<V>[EventName],
): void {
  createRenderEffect(
    () => access(value),
    source => source.on(event, callback),
  )
}
