/**
 * Global configuration for motion-solid.
 *
 * @example
 * ```ts
 * import { motionGlobalConfig } from 'motion-solid'
 * motionGlobalConfig.motionAttribute = 'data-mv'
 * ```
 */
export const motionGlobalConfig = {
  /**
   * The data attribute used to identify motion elements in the DOM.
   * Used for AnimatePresence exit detection and VE parent hierarchy resolution.
   */
  motionAttribute: 'data-ap',
}
