import type { TransformPoint } from 'motion-utils'
import type { Options } from '@/types'

/**
 * Motion configuration state shared through context
 */
export interface MotionConfigState {
  /** Default transition settings for animations */
  transition?: Options['transition']
  /**
   * @deprecated Use `reducedMotion` instead
   */
  reduceMotion?: 'user' | 'never' | 'always'
  /** Controls motion reduction based on user preference or explicit setting */
  reducedMotion?: 'user' | 'never' | 'always'
  /** Skip all animations in this subtree, applying final values instantly */
  skipAnimations?: boolean
  /** Custom nonce for CSP compliance with inline styles */
  nonce?: string
  /**
   * Transforms a page point (drag and pan input) before motion uses it, e.g. to
   * account for a scaled or rotated container.
   */
  transformPagePoint?: TransformPoint
  /**
   * Render motion components statically. Fixed for the lifetime of the `MotionConfig`
   * (it is read once), as in React.
   */
  isStatic?: boolean
  /** Options for the inView prop */
  inViewOptions?: Options['inViewOptions']
}

/** Props interface matching the config state */
export type MotionConfigProps = MotionConfigState
