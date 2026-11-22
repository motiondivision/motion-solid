import type { Accessor, Component } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { PanInfo } from 'motion-dom'
import type { Box } from 'motion-utils'
import { mergeRefs } from '@solid-primitives/refs'
import { asArray } from '@solid-primitives/utils'
import { createEffect, createMemo, createSignal, merge, omit, onFlush, onSettled } from 'solid-js'
import { invariant } from 'motion-utils'
import type { MotionComponentProps } from '@/components/motion/types'
import { Motion as MotionElement } from '@/components/motion'
import { mountedStates } from '@/state'
import type { ElementType } from '@/types'
import { createTransform } from '@/value/use-transform'
import { autoScrollIfNeeded, resetAutoScrollState } from './auto-scroll'
import { useReorderContext } from './context'
import { getDefaultMotionValue } from './utils'

// Motion's props are generic over the rendered tag; the tag here is dynamic.
const Motion = MotionElement as Component<Record<string, any>>

export interface ReorderItemState {
  /** True while the item is dragged, or grabbed from the keyboard. */
  isDragging: Accessor<boolean>
}

export type ReorderItemProps<V = any, T extends ElementType = 'li'> = Omit<
  MotionComponentProps<T>,
  'as' | 'value' | 'layout' | 'children'
> & {
  /** The element or component to render. Defaults to `li`. */
  as?: T
  /** The value in the list that this component represents. */
  value: V
  /**
   * A subset of layout options, primarily used to disable `layout="size"`.
   * @default true
   */
  layout?: true | 'position'
  /** Children, or a function of the item's drag state. */
  children?: JSX.Element | ((state: ReorderItemState) => JSX.Element)
}

type Handler<E> = ((event: E) => void) | [(data: any, event: E) => void, any] | undefined

/** Solid handler props are a function or a `[handler, data]` pair. */
function callUserHandler<E extends Event>(handler: Handler<E>, event: E) {
  if (Array.isArray(handler))
    handler[0](handler[1], event)
  else if (typeof handler === 'function')
    handler(event)
}

/**
 * An item in a `Reorder.Group`. It registers its layout with the group, drags along
 * the group's axis and takes part in keyboard reordering.
 */
export function ReorderItem<V = any, T extends ElementType = 'li'>(props: ReorderItemProps<V, T>): JSX.Element {
  const context = useReorderContext(null)
  // Fail during setup, not render
  invariant(Boolean(context), 'Reorder.Item must be a descendant of Reorder.Group')
  const {
    axis,
    registerItem,
    updateOrder,
    groupRef,
    hasReordered,
    setHasReordered,
    isTabStop,
    setActive,
    checkTabStop,
    elements,
    onKeyDown: reorderKeyDown,
  } = context!

  const styleValue = (key: 'x' | 'y') => createMemo(() => getDefaultMotionValue((props.style as any)?.[key]))
  const point = { x: styleValue('x'), y: styleValue('y') }

  const zIndex = createTransform(() => (point.x().get() || point.y().get()) ? 1 : 'unset')

  const [orderBeforeGrab, setOrderBeforeGrab] = createSignal<V[] | undefined>(undefined, { ownedWrite: true })
  const [isDragging, setIsDragging] = createSignal(false, { ownedWrite: true })

  const element: { current: HTMLElement | null } = { current: null }
  const setElement = (el: HTMLElement | null) => {
    element.current = el ?? null
  }
  // The user's ref is forwarded to the element once, as Solid does for `ref={props.ref}`. It is
  // read in a memo and handed to the motion component as a lazy `ref` prop: reading `props.ref`
  // in the component body emits STRICT_READ_UNTRACKED when `props` is a merge (a spread).
  const ref = createMemo(() => mergeRefs(...asArray((props as any).ref), setElement))

  // Register the element under its value; follows value changes and unregisters on unmount.
  createEffect(
    () => props.value,
    (value) => {
      elements?.set(value, element)
      checkTabStop?.()
      return () => {
        if (elements?.get(value) === element)
          elements.delete(value)
        checkTabStop?.()
      }
    },
  )

  onSettled(() => {
    checkTabStop?.()
  })

  function setKeyboardGrab(target: Element, order?: V[]) {
    setOrderBeforeGrab(() => order)
    setIsDragging(Boolean(order))
    mountedStates.get(target)?.setActive('whileDrag', Boolean(order))
  }

  function handleKeyDown(event: KeyboardEvent) {
    callUserHandler((props as any).onKeyDown, event)
    reorderKeyDown?.(event, props.value, orderBeforeGrab(), setKeyboardGrab)
  }

  function handleBlur(event: FocusEvent) {
    callUserHandler((props as any).onBlur, event)
    if (!orderBeforeGrab())
      return

    const target = event.currentTarget as HTMLElement
    // A keyed reorder can briefly blur the item before focus is restored.
    // Only drop the grab when focus remains elsewhere after that.
    onFlush(() => {
      if (orderBeforeGrab() && target.ownerDocument.activeElement !== target)
        setKeyboardGrab(target)
    })
  }

  function handleFocusIn(event: FocusEvent) {
    callUserHandler((props as any).onFocusIn, event)
    setActive?.(props.value)
  }

  const drag = createMemo(() => {
    if (props.drag !== undefined)
      return props.drag
    return axis?.() === 'xy' ? true : axis?.()
  })

  // Track drag position for auto-scroll
  function handleDrag(event: PointerEvent, info: PanInfo) {
    const { velocity, point: pointerPoint } = info
    const offset = { x: point.x().get(), y: point.y().get() }

    // Always attempt to update order: checkReorder handles the logic
    updateOrder?.(props.value, offset, velocity)

    const currentAxis = axis?.()
    const scrollAxis = (currentAxis === 'xy'
      ? (Math.abs(velocity.x) > Math.abs(velocity.y) ? 'x' : 'y')
      : currentAxis) as 'x' | 'y'

    autoScrollIfNeeded(
      groupRef?.() as Element,
      pointerPoint?.[scrollAxis],
      scrollAxis,
      velocity?.[scrollAxis],
    )
    if (!isDragging())
      setIsDragging(true)
    props.onDrag?.(event, info)
  }

  function handleDragEnd(event: PointerEvent, info: PanInfo) {
    // Drag-end fires a frame after release, so after the release's click
    if (hasReordered?.())
      setHasReordered?.(false)
    setIsDragging(false)
    resetAutoScrollState()
    props.onDragEnd?.(event, info)
  }

  const motionProps = omit(
    props as any,
    'as',
    'value',
    'layout',
    'children',
    'ref',
    'style',
    'drag',
    'dragSnapToOrigin',
    'onDrag',
    'onDragEnd',
    'onKeyDown',
    'onFocusIn',
    'onBlur',
    'onLayoutMeasure',
  ) as Record<string, any>

  const children = () => {
    const c = props.children
    return typeof c === 'function' ? (c as (state: ReorderItemState) => JSX.Element)({ isDragging }) : c
  }

  const itemProps = merge(
    {
      get ref() {
        return ref()
      },
      get tabindex() {
        return isTabStop?.(props.value) ? 0 : -1
      },
    },
    motionProps,
    {
      get as() {
        return props.as ?? 'li'
      },
      get layout() {
        return props.layout ?? true
      },
      get style() {
        return {
          ...(props.style as Record<string, any>),
          x: point.x(),
          y: point.y(),
          zIndex,
        }
      },
      get drag() {
        return drag()
      },
      dragSnapToOrigin: true,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
      onKeyDown: handleKeyDown,
      onFocusIn: handleFocusIn,
      onBlur: handleBlur,
      onLayoutMeasure: (measured: Box, prev: Box) => {
        registerItem?.(props.value, measured)
        props.onLayoutMeasure?.(measured, prev)
      },
    },
  )

  return (
    <Motion {...itemProps}>
      {children()}
    </Motion>
  ) as unknown as JSX.Element
}
