import { createSignal } from 'solid-js'
import { wrap } from 'motion-utils'

export type Cycle = (i?: number) => void
export type CycleState<T> = [Accessor<T>, Cycle]

type Accessor<T> = () => T

/**
 * Cycles through a series of values, like `createSignal` with a built-in `cycle` setter.
 * Pass an index to jump to a specific item.
 *
 * ```tsx
 * const [x, cycleX] = createCycle(0, 50, 100)
 * <motion.div animate={{ x: x() }} onTap={() => cycleX()} />
 * ```
 */
export function createCycle<T>(...items: T[]): CycleState<T> {
  const [index, setIndex] = createSignal(0)
  const item = () => items[index()]
  const cycle: Cycle = (next) => {
    setIndex(prev => typeof next !== 'number' ? wrap(0, items.length, prev + 1) : next)
  }
  return [item, cycle]
}
