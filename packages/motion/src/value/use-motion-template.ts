import type { MotionValue } from 'motion-dom'
import { isMotionValue } from 'motion-dom'
import type { Accessor } from 'solid-js'
import { createCombineMotionValues } from './use-combine-values'

type TemplateValue = MotionValue | Accessor<unknown> | number | string

/**
 * Combines multiple values into a new MotionValue using template string syntax.
 * Each interpolation can be a MotionValue, a plain value, or an accessor (so Solid signals
 * work too).
 *
 * ```ts
 * const shadowX = createSpring(0)
 * const shadowY = createMotionValue(0)
 * const shadow = createMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.3))`
 *
 * <motion.div style={{ filter: shadow }} />
 * ```
 */
export function createMotionTemplate(
  fragments: TemplateStringsArray,
  ...values: TemplateValue[]
): MotionValue<string> {
  const numFragments = fragments.length

  /**
   * Builds the string from the latest values. MotionValues read here are collected, so the
   * result updates when any of them change.
   */
  function buildValue() {
    let output = ''

    for (let i = 0; i < numFragments; i++) {
      output += fragments[i]
      const value = values[i]
      if (value !== undefined && value !== null) {
        if (isMotionValue(value))
          output += value.get()
        else if (typeof value === 'function')
          output += value()
        else
          output += value
      }
    }

    return output
  }

  return createCombineMotionValues(buildValue)
}
