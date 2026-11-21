import { MotionValue, acceleratedValues, transformProps } from 'motion-dom'
import type { WillChange } from 'motion-dom'

/**
 * A `will-change` MotionValue: starts as `"auto"` and becomes `"transform"` once a
 * transform or GPU-accelerated value is added to it by a motion component.
 */
export class WillChangeMotionValue extends MotionValue<string> implements WillChange {
  private isEnabled = false

  add(name: string) {
    if (transformProps.has(name) || acceleratedValues.has(name)) {
      this.isEnabled = true
      this.update()
    }
  }

  private update() {
    this.set(this.isEnabled ? 'transform' : 'auto')
  }
}

/**
 * Creates a `will-change` MotionValue to pass as `style.willChange` to a motion component,
 * which then keeps it up to date with the values it animates.
 *
 * ```tsx
 * const willChange = createWillChange()
 * return <motion.div style={{ willChange }} animate={{ x: 100 }} />
 * ```
 */
export function createWillChange(): WillChange {
  return new WillChangeMotionValue('auto')
}
