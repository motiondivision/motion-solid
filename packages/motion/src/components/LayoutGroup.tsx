import type { JSX } from '@solidjs/web'
import { merge } from 'solid-js'
import { LayoutGroupContext } from './context'
import type { LayoutGroupProps } from './use-layout-group'
import { createLayoutGroupProvider } from './use-layout-group'

export type { LayoutGroupProps }

/**
 * Groups motion components so their layout animations are coordinated, and namespaces
 * `layoutId`s with `id`. `inherit` (default `true`) joins the parent group's id and group.
 */
export function LayoutGroup(props: LayoutGroupProps & { children?: JSX.Element }): JSX.Element {
  const state = createLayoutGroupProvider(merge({ inherit: true as boolean | 'id' | 'group' }, props))
  return <LayoutGroupContext value={state}>{props.children}</LayoutGroupContext>
}
