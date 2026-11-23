import type { Accessor } from 'solid-js'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { access } from '@solid-primitives/utils'
import { createSignal, onSettled } from 'solid-js'

/**
 * Anything that can point at an element: an element, an accessor returning
 * one, or a `{ current }` object such as the scope from `createAnimate`.
 */
export type ElementInput = MaybeAccessor<Element | null | undefined> | { current: Element | null | undefined }

/**
 * Skips text and comment nodes, returning the first real element.
 */
export function getMotionElement(el: Node | null | undefined): Element | undefined {
  while (el && (el.nodeType === 3 || el.nodeType === 8))
    el = el.nextSibling
  return (el as Element | null) ?? undefined
}

/**
 * Resolves an `ElementInput`. Reactive when the input is an accessor.
 */
export function resolveElementInput(input: ElementInput): Element | undefined {
  // Check the input itself first: the scope from `createAnimate` is a function with a `current`
  // property, and `access()` must not be allowed to treat it as an accessor.
  if (isCurrentBox(input))
    return getMotionElement(input.current)
  const value = access(input as MaybeAccessor<any>)
  if (isCurrentBox(value))
    return getMotionElement(value.current)
  return getMotionElement(value)
}

/** `{ current }` objects and functions carrying `current` (like the `createAnimate` scope), but not DOM nodes. */
function isCurrentBox(value: unknown): value is { current: Element | null | undefined } {
  return value != null
    && (typeof value === 'object' || typeof value === 'function')
    && 'current' in value
    && !('nodeType' in value)
}

/**
 * Creates a reactive element reference: `[element, ref]`. Pass `ref` as a Solid
 * `ref` and read the element through the accessor.
 *
 * ```tsx
 * const [el, ref] = createDomRef()
 * const inView = createInView(el)
 * return <div ref={ref} />
 * ```
 */
export function createDomRef<T extends Element = Element>(): [element: Accessor<T | undefined>, ref: (el: T | null | undefined) => void] {
  const [element, setElement] = createSignal<T | undefined>(undefined, { ownedWrite: true })
  return [element, el => setElement(() => getMotionElement(el) as T | undefined)]
}

/**
 * Accessor that turns `true` once the owner has mounted (refs assigned during render are set
 * by then). Read it inside a computation that resolves a plain, non-reactive `ElementInput`
 * (`() => el`, `{ current }`) so it resolves again after mount. Created on the server too so
 * hydration ids line up; it never flips there.
 */
export function createMounted(): Accessor<boolean> {
  const [mounted, setMounted] = createSignal(false)
  onSettled(() => {
    setMounted(true)
  })
  return mounted
}
