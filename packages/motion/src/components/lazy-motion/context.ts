import type { Accessor } from 'solid-js'
import type { MotionBundle } from '@/state/motion-state'
import { createContext } from '@/utils/createContext'

export interface LazyMotionContextValue {
  /** The (possibly async-resolved) render + feature bundle. Empty until loaded. */
  features: Accessor<MotionBundle>
  strict: boolean
}

const defaultLazyMotion: LazyMotionContextValue = {
  features: () => ({}),
  strict: false,
}

const [useLazyMotionCtx, LazyMotionContext] = createContext<LazyMotionContextValue>('LazyMotion', defaultLazyMotion)

export { LazyMotionContext }

/**
 * The nearest `LazyMotion`'s context. Without one, `features()` is an empty bundle
 * and `strict` is false. Pass `null` to detect whether a provider exists.
 */
export const useLazyMotionContext = useLazyMotionCtx
