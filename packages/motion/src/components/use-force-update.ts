import type { Accessor } from 'solid-js'
import { createSignal } from 'solid-js'

/**
 * A counter that bumps whenever `forceUpdate` is called. Read `key()` in a tracking
 * scope to re-run when an update is forced (Solid's stand-in for a forced re-render).
 */
export function createForceUpdate(): [forceUpdate: VoidFunction, key: Accessor<number>] {
  // forceUpdate is called from layout feature callbacks, which can run inside an
  // owned scope; the signal is internal to the layout group.
  const [key, setKey] = createSignal(0, { ownedWrite: true })
  function forceUpdate() {
    setKey(k => k + 1)
  }

  return [forceUpdate, key]
}
