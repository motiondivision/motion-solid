import type { JSX } from '@solidjs/web'
import { children, createMemo } from 'solid-js'
import { defaultElementPredicate, getResolvedElements } from '@solid-primitives/refs'
import { asArray } from '@solid-primitives/utils'
import type { AnimateViewProps } from './types'
import { createAnimateView } from './use-animate-view'

/**
 * Animate enter, exit, update and shared element transitions using the
 * browser's View Transitions API. Adds no wrapper DOM element.
 *
 * State updates must be wrapped in `startTransition`:
 *
 * ```tsx
 * <button onClick={() => startTransition(() => setShow(s => !s))}>Toggle</button>
 * <Show when={show()}><AnimateView><div class="box" /></AnimateView></Show>
 * ```
 */
export function AnimateView(props: AnimateViewProps & { children?: JSX.Element }): JSX.Element {
  const resolved = children(() => props.children)
  const elements = createMemo(() =>
    asArray(getResolvedElements<Element>(resolved(), defaultElementPredicate) ?? []),
  )

  createAnimateView(props, elements)

  return resolved as unknown as JSX.Element
}
