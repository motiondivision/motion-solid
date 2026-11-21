import type { MotionState } from '@/state/motion-state'
import { createContext } from '@/utils/createContext'

export interface PresenceContext {
  initial?: boolean
  custom?: any
  /**
   * Registry of motion states under this AnimatePresence, fed by
   * ExitFeature at mount/unmount. Context resolves to the nearest ancestor,
   * so nested AnimatePresence instances scope correctly without DOM tagging.
   */
  register?: (state: MotionState) => void
  unregister?: (state: MotionState) => void
  /** Registry of `createPresence()` handlers under this AnimatePresence. */
  registerHandler?: (handler: PresenceHandler) => void
  unregisterHandler?: (handler: PresenceHandler) => void
  isChild?: (el: Element) => boolean
}

/**
 * A component's own exit, for components that animate out without a
 * `motion` element's `exit` (see `createPresence`).
 */
export interface PresenceHandler {
  /** The element whose removal waits for `onExit`. */
  element: () => Element | null | undefined
  /** Starts the exit. Removal waits for the returned promise. */
  onExit: () => Promise<unknown> | void
  /** The element came back while its exit was running. */
  onEnter?: () => void
}

const [useAnimatePresenceCtx, AnimatePresenceContext] = createContext<PresenceContext>('AnimatePresence', {})

export { AnimatePresenceContext }

/**
 * The nearest AnimatePresence's context; an empty object (no registry) outside one.
 * Pass `null` to detect whether an AnimatePresence encloses the caller.
 */
export const useAnimatePresenceContext = useAnimatePresenceCtx
