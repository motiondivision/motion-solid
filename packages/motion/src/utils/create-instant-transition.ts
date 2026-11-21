import { frame, rootProjectionNode } from 'motion-dom'
import { MotionGlobalConfig } from 'motion-utils'

/**
 * Returns a function that runs a callback as an instant layout transition: layout
 * animations are blocked for any layout change the callback causes.
 */
export function createInstantLayoutTransition(): (callback?: () => void) => void {
  return startInstantLayoutTransition
}

/**
 * Unlike React's `useInstantLayoutTransition`, the callback also runs when there is no
 * layout tree yet (there is nothing to block then, but the caller's update must not be lost).
 */
function startInstantLayoutTransition(callback?: () => void) {
  const root = rootProjectionNode.current
  if (root) {
    root.isUpdating = false
    root.blockUpdate()
  }
  callback?.()
}

/** Counts instant transitions so only the latest one unblocks animations. */
let instantTransitionCount = 0

/**
 * Returns a function that runs a callback as an instant transition: every animation
 * started by the changes the callback makes completes immediately, and layout animations
 * are blocked. Animations are allowed again two frames later.
 *
 * ```tsx
 * const instant = createInstantTransition()
 * return <button onClick={() => instant(() => setOpen(true))} />
 * ```
 */
export function createInstantTransition(): (callback: () => void) => void {
  const startInstantLayoutTransition = createInstantLayoutTransition()

  return (callback) => {
    const id = ++instantTransitionCount
    startInstantLayoutTransition(() => {
      MotionGlobalConfig.instantAnimations = true
      callback()
    })
    /**
     * Unblock after two frames, otherwise this would unblock too soon. A later call
     * moves the deadline, so an earlier call does not unblock the current one.
     */
    frame.postRender(() =>
      frame.postRender(() => {
        if (id !== instantTransitionCount)
          return
        MotionGlobalConfig.instantAnimations = false
      }),
    )
  }
}

/** Allow animations again after an instant transition. */
export function disableInstantTransitions() {
  MotionGlobalConfig.instantAnimations = false
}
