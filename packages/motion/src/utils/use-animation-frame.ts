import { cancelFrame, frame } from 'motion-dom'
import type { FrameData } from 'motion-dom'
import { onCleanup } from 'solid-js'
import { isServer } from '@solidjs/web'

export type FrameCallback = (timestamp: number, delta: number) => void

/**
 * Runs `callback` every animation frame with the time since the first frame
 * and the frame delta. Stops when the owner is disposed.
 *
 * Uses motion's frameloop (not `@solid-primitives/raf`) so the callback runs in
 * the `update` step, in sync with motion value animations and rendering.
 */
export function createAnimationFrame(callback: FrameCallback) {
  if (isServer)
    return

  let initialTimestamp = 0

  const provideTimeSinceStart = ({ timestamp, delta }: FrameData) => {
    if (!initialTimestamp)
      initialTimestamp = timestamp
    callback(timestamp - initialTimestamp, delta)
  }

  frame.update(provideTimeSinceStart, true)
  onCleanup(() => cancelFrame(provideTimeSinceStart))
}
