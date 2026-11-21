import type { Accessor } from 'solid-js'
import type { Box, Point } from 'motion-utils'
import type { ReorderAxis } from './types'
import { createContext } from '@/utils/createContext'

export interface ReorderContextProps<T> {
  axis?: Accessor<ReorderAxis>
  registerItem?: (item: T, layout: Box) => void
  updateOrder?: (item: T, offset: Point, velocity: Point) => void
  onKeyDown?: (
    event: KeyboardEvent,
    item: T,
    orderBeforeGrab: T[] | undefined,
    setKeyboardGrab: (element: Element, orderBeforeGrab?: T[]) => void,
  ) => void

  /**
   * Whether a reorder happened during the current press. The release that
   * ends a reordering drag fires a click that isn't a real click (#2682).
   */
  hasReordered?: Accessor<boolean>
  setHasReordered?: (value: boolean) => void

  /**
   * Whether an item is in the tab order. Only one in `values` is: the
   * last focused, or the first rendered.
   */
  isTabStop?: (item: T) => boolean
  setActive?: (item: T) => void
  checkTabStop?: () => void
  /**
   * Each item's element, for arrow keys to focus.
   */
  elements?: Map<T, { current: HTMLElement | null }>

  groupRef?: Accessor<HTMLElement | null | undefined>
}

const [useReorderCtx, ReorderContext] = createContext<ReorderContextProps<any>>('ReorderGroup')

export { ReorderContext }

/** The nearest `Reorder.Group`'s context. Throws outside a group; pass `null` to detect one. */
export const useReorderContext = useReorderCtx
