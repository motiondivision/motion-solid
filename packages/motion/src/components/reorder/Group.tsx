import type { Component } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { Box, Point } from 'motion-utils'
import { createEventListener } from '@solid-primitives/event-listener'
import { mergeRefs } from '@solid-primitives/refs'
import { asArray } from '@solid-primitives/utils'
import { createEffect, createMemo, createRenderEffect, createSignal, merge, omit, onFlush } from 'solid-js'
import { invariant, moveItem } from 'motion-utils'
import type { MotionComponentProps } from '@/components/motion/types'
import type { AsTag } from '@/types'
import { Motion as MotionElement } from '@/components/motion'
import { createDomRef } from '@/utils/use-dom-ref'
import type { ReorderContextProps } from './context'
import { ReorderContext } from './context'
import type { ItemData, ReorderAxis } from './types'
import { checkReorder, detectAxis, keyTarget } from './utils'

// Motion's props are generic over the rendered tag; the tag here is dynamic.
const Motion = MotionElement as Component<Record<string, any>>

export type ReorderGroupProps<V = any, T extends AsTag = 'ul'> = Omit<
  MotionComponentProps<T>,
  'as' | 'axis' | 'values' | 'onReorder'
> & {
  /** The element or component to render. Defaults to `ul`. */
  as?: T
  /**
   * The axis to reorder along. By default it is detected from the measured item
   * layouts. Set `"xy"` to reorder in wrapped / grid layouts.
   */
  axis?: ReorderAxis
  /**
   * Called with the new value order. It fires for each step of a drag, not only
   * when the drag ends. The second argument is the value that moved.
   */
  onReorder: (newOrder: V[], moved: V) => void
  /** The latest values state. */
  values: V[]
}

/**
 * A group of `Reorder.Item`s that can be reordered by dragging, or from the keyboard
 * (Space grabs, arrows move, Escape cancels).
 *
 * ```tsx
 * <Reorder.Group values={items()} onReorder={setItems}>
 *   <For each={items()}>{item => <Reorder.Item value={item}>{item}</Reorder.Item>}</For>
 * </Reorder.Group>
 * ```
 */
export function ReorderGroup<V = any, T extends AsTag = 'ul'>(props: ReorderGroupProps<V, T>): JSX.Element {
  const itemLayouts = new Map<V, Box>()
  const elements = new Map<V, { current: HTMLElement | null }>()

  // Imperative state, read from layout/gesture/keyboard callbacks that may run
  // inside a reactive scope. It mirrors the props in the render effect below.
  let latestValues: V[] = []
  let latestAxis: ReorderAxis | undefined
  let detected: ReorderAxis = 'y'
  let activeValue: V | undefined
  let isReordering = false
  // Set when a drag reorders; the release ending that drag isn't a click (#2682).
  // Nothing renders from it, so it is a plain flag rather than a signal.
  let reordered = false

  // Reactive state, read while rendering items.
  const [active, setActiveSignal] = createSignal<V | undefined>(undefined, { ownedWrite: true })
  const [detectedAxis, setDetectedAxis] = createSignal<ReorderAxis>('y', { ownedWrite: true })
  const [groupRef, setGroupRef] = createDomRef<HTMLElement>()

  const axis = createMemo<ReorderAxis>(() => props.axis || detectedAxis())
  const valuesSet = createMemo(() => new Set(props.values))
  const tabStop = createMemo(() => valuesSet().has(active() as V) ? active() : props.values[0])

  function isRendered(value?: V) {
    return elements.get(value as V)?.current?.isConnected
  }

  /** Only values in `values` can be the tab stop. */
  function activate(value: V) {
    if (latestValues.includes(value)) {
      activeValue = value
      setActiveSignal(() => value)
    }
  }

  /**
   * If the tab stop isn't rendered (e.g. it's virtualized), the first rendered
   * item takes its place. Items check again when they unmount.
   */
  function checkTabStop() {
    const stop = latestValues.includes(activeValue as V) ? activeValue : latestValues[0]
    if (isRendered(stop))
      return
    const first = latestValues.find(value => isRendered(value))
    if (first !== undefined)
      activate(first)
  }

  let checked = false
  createRenderEffect(
    () => {
      invariant(Boolean(props.values), 'Reorder.Group must be provided a values prop')
      return [props.values, props.axis] as const
    },
    ([values, axisProp]) => {
      latestValues = values
      latestAxis = axisProp
      const set = new Set(values)
      for (const map of [itemLayouts, elements] as Map<V, unknown>[]) {
        map.forEach((_, value) => {
          if (!set.has(value))
            map.delete(value)
        })
      }
      // After the first run, the check runs after this flush in its own pass: activating the first
      // rendered item writes `active`, which every item reads, and doing that inside this effect made
      // each item render twice for one change of `values`. The first run is part of creating the
      // group (an owned scope, where onFlush is not allowed), and nothing has rendered from `active` yet.
      if (checked)
        onFlush(checkTabStop)
      else {
        checked = true
        checkTabStop()
      }
    },
  )

  // The previous reorder has rendered by the time the next effects run.
  createEffect(
    () => props.values,
    () => {
      isReordering = false
    },
    { defer: true },
  )

  function getOrder(): ItemData<V>[] {
    return latestValues.flatMap((value) => {
      const layout = itemLayouts.get(value)
      return layout ? [{ value, layout }] : []
    })
  }

  function isRTL() {
    const element = groupRef()
    return element?.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl'
  }

  function commit(newOrder: ItemData<V>[], moved: V) {
    let i = 0
    const newValues = latestValues.map(value =>
      itemLayouts.has(value) ? newOrder[i++].value : value,
    )
    if (newValues.some((value, index) => value !== latestValues[index]))
      props.onReorder?.(newValues, moved)
  }

  function restoreFocus(element: Element) {
    const document = element.ownerDocument
    if (document.activeElement !== element)
      return
    // Reordering the DOM can drop focus; put it back once the new order has rendered.
    onFlush(() => {
      if (element.isConnected && document.activeElement !== element)
        (element as HTMLElement).focus()
    })
  }

  const context: ReorderContextProps<V> = {
    groupRef,
    axis,
    hasReordered: () => reordered,
    setHasReordered: (value) => {
      reordered = value
    },
    isTabStop: value => value === tabStop() || !valuesSet().has(value),
    setActive: activate,
    checkTabStop,
    elements,
    /**
     * Space grabs and drops the item, arrows along `axis` move the grabbed
     * item one place, or a row in a grid (see keyTarget), or move focus that
     * way if it isn't grabbed, and Escape restores the order in `orderBeforeGrab`,
     * the values when it was grabbed. Keys from children or with modifiers
     * (Alt+Left etc.) are left alone.
     */
    onKeyDown: (event, item, orderBeforeGrab, setKeyboardGrab) => {
      const { key, currentTarget } = event
      if (
        event.defaultPrevented
        || event.target !== currentTarget
        || event.altKey
        || event.ctrlKey
        || event.metaKey
      ) {
        return
      }

      const order = getOrder()
      const currentAxis = latestAxis || detected
      const keyIndex = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].indexOf(key)
      const isX = keyIndex % 2
      if (key === ' ') {
        if (!event.repeat)
          setKeyboardGrab(currentTarget as Element, orderBeforeGrab ? undefined : [...latestValues])
      }
      else if (key === 'Escape' && orderBeforeGrab) {
        const kept = orderBeforeGrab.flatMap(value => order.filter(data => data.value === value))
        commit(order.map(data => orderBeforeGrab.includes(data.value) ? kept.shift()! : data), item)
        restoreFocus(currentTarget as Element)
        setKeyboardGrab(currentTarget as Element)
      }
      else if (keyIndex < 0 || (currentAxis !== 'xy' && currentAxis !== (isX ? 'x' : 'y'))) {
        return
      }
      else {
        // Focus only moves between rendered items
        const list = orderBeforeGrab
          ? order
          : order.filter(({ value }) => isRendered(value))
        const index = list.findIndex(({ value }) => value === item)
        const target = keyTarget(list, index, keyIndex, currentAxis, Boolean(isX) && isRTL())
        if (target > -1) {
          if (orderBeforeGrab) {
            commit(moveItem(order, index, target), item)
            restoreFocus(currentTarget as Element)
          }
          else {
            elements.get(list[target].value)?.current?.focus()
          }
        }
      }
      event.preventDefault()
    },
    registerItem: (value: V, layout: Box) => {
      itemLayouts.set(value, layout)
      if (!latestAxis) {
        const nextAxis = detectAxis(latestValues.flatMap((itemValue) => {
          const itemLayout = itemLayouts.get(itemValue)
          return itemLayout ? [itemLayout] : []
        }))
        if (nextAxis !== detected) {
          detected = nextAxis
          setDetectedAxis(nextAxis)
        }
      }
    },
    updateOrder: (item: V, offset: Point, velocity: Point) => {
      if (isReordering)
        return

      const order = getOrder()
      const newOrder = checkReorder(
        order,
        item,
        offset,
        velocity,
        latestAxis || detected,
        isRTL() ? 'rtl' : 'ltr',
      )
      if (order !== newOrder) {
        isReordering = true
        reordered = true
        commit(newOrder, item)
      }
    },
  }

  /**
   * A release that ends a reordering drag isn't a click. Browsers only click an
   * element holding both the press and release targets, so swallow it here,
   * above every item (#2682). The flag is cleared when the drag ends (a frame
   * after the release's click) or on the next press. Clicks with no pointer
   * press behind them (detail 0, e.g. keyboard) are left alone.
   */
  createEventListener(groupRef, 'click', (event: MouseEvent) => {
    if (reordered && event.detail) {
      reordered = false
      event.stopPropagation()
      event.preventDefault()
    }
  }, { capture: true })

  createEventListener(groupRef, 'pointerdown', () => {
    reordered = false
  }, { capture: true })

  // Read in a memo and handed over as a lazy `ref` prop: reading `props.ref` in the component
  // body emits STRICT_READ_UNTRACKED when `props` is a merge (a spread).
  const ref = createMemo(() => mergeRefs(...asArray((props as any).ref), setGroupRef))

  const motionProps = omit(props as any, 'as', 'axis', 'values', 'onReorder', 'ref', 'style', 'children') as Record<string, any>

  return (
    <ReorderContext value={context}>
      <Motion
        {...merge(motionProps, {
          get ref() {
            return ref()
          },
          get as() {
            return props.as ?? 'ul'
          },
          get style() {
            return { 'overflow-anchor': 'none', ...(props.style as Record<string, any>) }
          },
        })}
      >
        {props.children}
      </Motion>
    </ReorderContext>
  ) as unknown as JSX.Element
}
