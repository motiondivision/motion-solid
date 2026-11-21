import type { JSX } from '@solidjs/web'
import type { MotionValue } from 'motion-dom'
import { isServer } from '@solidjs/web'
import { createEffect, createMemo } from 'solid-js'

/**
 * Renders a `MotionValue` as text, updating the text node directly when the value
 * changes, without re-rendering anything else.
 *
 * ```tsx
 * <RowValue value={count} />
 * ```
 */
export function RowValue<T>(props: { value: MotionValue<T> }): JSX.Element {
  // The text node is rebuilt only when a different MotionValue is passed.
  const node = createMemo(() => {
    const text = String(props.value.get())
    return isServer ? text : document.createTextNode(text)
  })

  createEffect(
    () => [props.value, node()] as const,
    ([value, text]) => {
      if (typeof text === 'string')
        return
      return value.on('change', (latest) => {
        text.textContent = String(latest)
      })
    },
  )

  return node as unknown as JSX.Element
}
