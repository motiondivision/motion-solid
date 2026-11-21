import type { MotionValue } from 'motion-dom'
import { cancelFrame, frame, motionValue } from 'motion-dom'
import type { FrameData } from 'motion-dom'
import { isServer } from '@solid-primitives/utils'
import { onCleanup } from 'solid-js'

/**
 * Creates a MotionValue that updates every animation frame with the time in milliseconds
 * since it was created (the first frame reports `0`).
 *
 * Driven by Motion's own frame loop (`frame.update`, keep-alive) rather than a separate
 * `requestAnimationFrame`, so it is processed in the same frame as other MotionValue updates.
 */
export function createTime(): MotionValue<number> {
  const time = motionValue(0)
  if (isServer)
    return time

  let initialTimestamp = 0

  const provideTimeSinceStart = ({ timestamp }: FrameData) => {
    if (!initialTimestamp)
      initialTimestamp = timestamp
    time.set(timestamp - initialTimestamp)
  }

  frame.update(provideTimeSinceStart, true)
  onCleanup(() => cancelFrame(provideTimeSinceStart))

  return time
}
