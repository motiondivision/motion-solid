import { warnOnce } from 'motion-utils'
import type { CreateScrollOptions, ScrollElement } from './use-scroll'
import { createScroll } from './use-scroll'

/**
 * @deprecated `createElementScroll` is deprecated. Convert to `createScroll({ container })`.
 */
export function createElementScroll(container: ScrollElement) {
  warnOnce(false, 'createElementScroll is deprecated. Convert to createScroll({ container }).')
  return createScroll({ container })
}

/**
 * @deprecated `createViewportScroll` is deprecated. Convert to `createScroll()`.
 */
export function createViewportScroll(options?: CreateScrollOptions) {
  warnOnce(false, 'createViewportScroll is deprecated. Convert to createScroll().')
  return createScroll(options)
}
