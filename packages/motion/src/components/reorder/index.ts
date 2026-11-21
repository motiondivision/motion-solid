import { ReorderGroup } from './Group'
import { ReorderItem } from './Item'

export { ReorderGroup, ReorderItem }
export type { ReorderGroupProps } from './Group'
export type { ReorderItemProps, ReorderItemState } from './Item'
export { ReorderContext, useReorderContext } from './context'
export type { ReorderContextProps } from './context'
export type { ItemData, ReorderAxis } from './types'

/** `Reorder.Group` and `Reorder.Item`. */
export const Reorder = {
  Group: ReorderGroup,
  Item: ReorderItem,
}
