import type { Accessor } from 'solid-js'
import type { NodeGroup } from 'motion-dom'
import { noop } from '@solid-primitives/utils'
import type { MotionState } from '@/state/motion-state'
import { createContext } from '@/utils/createContext'

const [useMotionCtx, MotionContext] = createContext<MotionState>('Motion')

/** Provide the parent `MotionState` with `<MotionContext value={state}>`. */
export { MotionContext }

/** The nearest ancestor motion component's state, or `null` at the root. */
export function useMotionContext(): MotionState | null {
  return useMotionCtx(null)
}

export interface LayoutGroupState {
  id?: string
  group?: NodeGroup
  forceRender?: VoidFunction
  /** Bumped by `forceRender`; read it in a tracking scope to re-run on group updates. */
  key?: Accessor<number>
}

/**
 * Re-runs layout for the layout components of a group (all of them without one). The layout
 * coordinator installs the real function while a layout component is mounted; this
 * indirection keeps the layout code out of bundles that never use `layout` (tree shaking).
 */
export const layoutRefresh: { run: (group?: NodeGroup) => void } = { run: noop }

const defaultLayoutGroup: LayoutGroupState = {
  // Outside a LayoutGroup there is no key to bump: re-run layout for every layout component.
  forceRender: () => layoutRefresh.run(),
  key: () => 0,
}

const [useLayoutGroupCtx, LayoutGroupContext] = createContext<LayoutGroupState>('LayoutGroup', defaultLayoutGroup)

export { LayoutGroupContext }

/** The nearest `LayoutGroup`'s state; an inert default when there is none. */
export function useLayoutGroupContext(): LayoutGroupState {
  return useLayoutGroupCtx()
}
