import { createMemo } from 'solid-js'
import { nodeGroup } from 'motion-dom'
import type { LayoutGroupState } from './context'
import { layoutRefresh, useLayoutGroupContext } from './context'
import { createForceUpdate } from './use-force-update'

/**
 * Props for configuring layout group behavior
 */
export interface LayoutGroupProps {
  /** Optional ID for the layout group */
  id?: string
  /**
   * Controls inheritance of parent group properties:
   * - true: Inherit both id and group
   * - 'id': Only inherit id
   * - 'group': Only inherit group
   */
  inherit?: boolean | 'id' | 'group'
}

/**
 * Create the state a `LayoutGroup` provides: group inheritance, force updates and
 * the update key. Provide the result with `<LayoutGroupContext value={state}>`.
 *
 * `id` and `group` are getters over `props`, so they follow `props.id` and
 * `props.inherit` and nothing is read until a consumer reads them in a tracking scope.
 */
export function createLayoutGroupProvider(props: LayoutGroupProps): LayoutGroupState {
  // Get the parent group, if there is one
  const parentGroup = useLayoutGroupContext()
  const [bump, key] = createForceUpdate()

  // A new group per `inherit` change; stable otherwise so projection nodes keep their group.
  const group = createMemo(() => getGroup(props, parentGroup))

  // `key` tells group members a refresh was requested; the coordinator animates the change
  // from each node's last measured layout, whether `forceRender` runs before or after the
  // DOM change it is meant for.
  const forceRender = () => {
    bump()
    layoutRefresh.run(group())
  }

  return {
    get id() {
      return getGroupId(props, parentGroup)
    },
    get group() {
      return group()
    },
    forceRender,
    key,
  }
}

/**
 * The nearest layout group's `forceRender`: re-measures the group's layout components and
 * animates whatever moved since their last measurement. Outside a `LayoutGroup` it does the
 * same for every layout component.
 */
export function createLayoutGroup() {
  const { forceRender } = useLayoutGroupContext()
  return { forceRender: forceRender ?? (() => layoutRefresh.run()) }
}

/**
 * Determines the group ID based on inheritance rules
 */
function getGroupId(props: LayoutGroupProps, parentGroup: LayoutGroupState) {
  const shouldInherit = props.inherit === true || props.inherit === 'id'
  const parentId = parentGroup.id

  if (shouldInherit && parentId) {
    return props.id ? `${parentId}-${props.id}` : parentId
  }
  return props.id
}

/**
 * Creates or inherits a node group based on inheritance rules
 */
function getGroup(props: LayoutGroupProps, parentGroup: LayoutGroupState) {
  const shouldInherit = props.inherit === true || props.inherit === 'group'
  return shouldInherit ? parentGroup.group || nodeGroup() : nodeGroup()
}
