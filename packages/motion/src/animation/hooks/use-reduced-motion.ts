import type { Accessor } from 'solid-js'
import { createMediaQuery } from '@solid-primitives/media'

/**
 * Reactive `prefers-reduced-motion: reduce`. `false` on the server and in
 * environments without `window.matchMedia`.
 */
export function createReducedMotion(): Accessor<boolean> {
  if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function')
    return () => false
  return createMediaQuery('(prefers-reduced-motion: reduce)')
}
