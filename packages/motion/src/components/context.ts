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

const defaultLayoutGroup: LayoutGroupState = {
  forceRender: noop,
  key: () => 0,
}

const [useLayoutGroupCtx, LayoutGroupContext] = createContext<LayoutGroupState>('LayoutGroup', defaultLayoutGroup)

export { LayoutGroupContext }

/** The nearest `LayoutGroup`'s state; an inert default when there is none. */
export function useLayoutGroupContext(): LayoutGroupState {
  return useLayoutGroupCtx()
}
