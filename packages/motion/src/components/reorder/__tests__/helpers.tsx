import type { JSX } from '@solidjs/web'
import type { Accessor, Setter } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { For, createSignal, flush } from 'solid-js'
import { vi } from 'vitest'
import { Reorder } from '../index'
import type { ReorderContextProps } from '../context'
import { useReorderContext } from '../context'
import type { ReorderAxis } from '../types'
import { mountedStates } from '@/state'

let currentContext: ReorderContextProps<string> | null = null

/** Captures the group's context so tests can feed it layouts (jsdom has no layout). */
export function ContextCapture(): JSX.Element {
  currentContext = useReorderContext()
  return null
}

export function cleanup() {
  document.body.innerHTML = ''
  currentContext = null
}

export function getContext() {
  return currentContext!
}

/** Lets pending Solid writes flush, and the microtasks they queue. */
export async function tick() {
  flush()
  await Promise.resolve()
  flush()
  await Promise.resolve()
}

export function order(container: HTMLElement) {
  return Array.from(container.querySelectorAll('li')).map(item => item.getAttribute('data-testid'))
}

export function focused() {
  return document.activeElement?.getAttribute('data-testid')
}

export function isGrabbed(element: Element) {
  return Boolean(mountedStates.get(element)?.visualElement.animationState?.getState().whileDrag.isActive)
}

export function registerLayouts(container: HTMLElement) {
  Array.from(container.querySelectorAll('li')).forEach((item, index) => {
    currentContext!.registerItem!(item.getAttribute('data-testid')!, {
      x: { min: index * 100, max: index * 100 + 100 },
      y: { min: index * 50, max: index * 50 + 50 },
    })
  })
}

export function registerGridLayouts(container: HTMLElement, columns = 3) {
  Array.from(container.querySelectorAll('li')).forEach((item, index) => {
    const x = (index % columns) * 100
    const y = Math.floor(index / columns) * 100
    currentContext!.registerItem!(item.getAttribute('data-testid')!, {
      x: { min: x, max: x + 100 },
      y: { min: y, max: y + 100 },
    })
  })
}

export async function press(element: Element, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  const result = element.dispatchEvent(event)
  await tick()
  return result
}

export async function renderGroup(options: {
  initial?: string[]
  axis?: ReorderAxis
  dir?: 'rtl'
  onReorder?: (newOrder: string[], moved: string) => void
  itemProps?: Record<string, any>
  unrendered?: string[]
} = {}) {
  const [items, setItems] = createSignal(options.initial ?? ['a', 'b', 'c'])
  const onReorder = options.onReorder ?? vi.fn()
  const wrapper = render(() => (
    <Reorder.Group
      values={items()}
      onReorder={(newOrder: string[], moved: string) => {
        onReorder(newOrder, moved)
        setItems(newOrder)
      }}
      axis={options.axis ?? 'y'}
      style={options.dir ? { direction: options.dir } : undefined}
    >
      <ContextCapture />
      <For each={items().filter(item => !options.unrendered?.includes(item))}>
        {item => (
          <Reorder.Item value={item} data-testid={item} whileDrag={{ opacity: 0.5 }} {...options.itemProps}>
            {item}
            <input data-testid={`${item}-input`} />
          </Reorder.Item>
        )}
      </For>
    </Reorder.Group>
  ))

  await tick()
  registerLayouts(wrapper.container)

  return { ...wrapper, items, setItems: setItems as Setter<string[]>, onReorder, itemsAccessor: items as Accessor<string[]> }
}
