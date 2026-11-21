import type { MotionValue } from 'motion-dom'
import { cancelFrame, frame, motionValue } from 'motion-dom'
import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createRenderEffect, onCleanup } from 'solid-js'
import { createMotionValueEvent } from './use-motion-value-event'

/**
 * Creates a MotionValue that updates when the velocity of the provided MotionValue changes.
 *
 * ```ts
 * const x = createMotionValue(0)
 * const xVelocity = createVelocity(x)
 * const xAcceleration = createVelocity(xVelocity)
 * ```
 */
export function createVelocity(value: MaybeAccessor<MotionValue<number>>): MotionValue<number> {
  const velocity = motionValue(0)

  const updateVelocity = () => {
    const latest = access(value).getVelocity()
    velocity.set(latest)

    /**
     * If there is still velocity, schedule an update for the next frame
     * to keep checking until it is zero.
     */
    if (latest)
      frame.update(updateVelocity)
  }

  // Seed with the source's current velocity (and re-seed if the source changes).
  createRenderEffect(
    () => access(value).getVelocity(),
    latest => velocity.set(latest),
  )

  createMotionValueEvent(value, 'change', () => {
    // Schedule an update to this value at the end of the current frame.
    frame.update(updateVelocity, false, true)
  })

  onCleanup(() => cancelFrame(updateVelocity))

  return velocity
}
