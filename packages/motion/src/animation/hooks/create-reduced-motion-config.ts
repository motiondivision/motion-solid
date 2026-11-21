import type { Accessor } from 'solid-js'
import { useMotionConfig } from '@/components/motion-config/context'
import { createReducedMotion } from './use-reduced-motion'

/**
 * Whether motion should be reduced, taking the nearest `MotionConfig`'s `reducedMotion`
 * into account: `"always"` is `true`, `"never"` (the default) is `false`, and `"user"`
 * follows the `prefers-reduced-motion` setting (see {@link createReducedMotion}).
 */
export function createReducedMotionConfig(): Accessor<boolean> {
  const config = useMotionConfig()
  const prefersReducedMotion = createReducedMotion()

  return () => {
    const { reducedMotion, reduceMotion } = config()
    const preference = reducedMotion ?? reduceMotion
    if (preference === 'always')
      return true
    if (preference === 'user')
      return prefersReducedMotion()
    return false
  }
}
