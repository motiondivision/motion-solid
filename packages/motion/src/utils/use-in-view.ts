import type { Accessor } from 'solid-js'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { access } from '@solid-primitives/utils'
import { inView } from 'framer-motion/dom'
import { createEffect, createMemo, createSignal } from 'solid-js'
import type { Options } from '@/types/state'
import type { ElementInput } from './use-dom-ref'
import { resolveElementInput } from './use-dom-ref'

type InViewOptions = NonNullable<Options['inViewOptions']>

export interface CreateInViewOptions extends Omit<InViewOptions, 'root'> {
  /** Element or document to use as the viewport. Defaults to the browser viewport. */
  root?: MaybeAccessor<Element | Document | null | undefined> | { current: Element | null | undefined }
  /** Only detect the first time the element enters view. */
  once?: boolean
  /** Initial value before the element is first observed. */
  initial?: boolean
}

/**
 * Returns an accessor that is `true` while the element is in view.
 *
 * Built on motion's `inView` rather than `@solid-primitives/intersection-observer`
 * (`createVisibilityObserver` / `createViewportObserver`), which could express root, margin
 * and amount as raw `IntersectionObserver` options but not the rest of what is needed here:
 * - Its options are read once, when the observer is created, and cannot change afterwards;
 *   `root`, `margin`, `amount` and `once` here are reactive, so the observer has to be rebuilt
 *   when they change (done below, keyed on the element and options).
 * - `once` needs the observer to stop watching an element after its first entry. `inView`
 *   does that when its enter callback returns no leave function; the primitives expose no
 *   such mode, so `once` would need a hand-rolled `unobserve` bookkeeping around them.
 * - `inView` binds to motion's animation scope (`bindToScope`/`addToScope`), so observers
 *   started inside a `createScopeMotion`/`createAnimate` scope are cleaned up with it.
 * - `<motion.div whileInView>` and `onViewportEnter`/`onViewportLeave` run on the same
 *   `inView` (`features/gestures/in-view`), so this primitive and the props behave the same,
 *   including how `amount` maps to `threshold` and how `margin` maps to `rootMargin`.
 * - `@solid-primitives/intersection-observer` is not a dependency of this package.
 */
export function createInView(
  element: ElementInput,
  options?: MaybeAccessor<CreateInViewOptions | undefined>,
): Accessor<boolean> {
  // Created on the server too so hydration ids line up; the effect below is inert there.
  const initial = createMemo(() => access(options)?.initial ?? false)
  const [isInView, setInView] = createSignal(() => initial())

  const el = createMemo(() => resolveElementInput(element))
  const once = createMemo(() => !!access(options)?.once)
  const margin = createMemo(() => access(options)?.margin)
  const amount = createMemo(() => access(options)?.amount)
  const root = createMemo(() => {
    const value = access(options)?.root as any
    return resolveElementInput(value) as Element | Document | undefined
  })

  let observed: Element | undefined
  // Plain mirror of "has entered", so the apply phase does not read the signal.
  let entered = false
  createEffect(
    () => ({
      el: el(),
      initial: initial(),
      once: once(),
      margin: margin(),
      amount: amount(),
      root: root(),
    }),
    (state) => {
      if (state.el !== observed) {
        // Reset when an element that was being observed is removed or replaced. The first
        // element keeps `initial`.
        const replaced = observed !== undefined
        observed = state.el
        if (replaced && !state.once) {
          entered = false
          setInView(state.initial)
        }
      }
      if (!state.el || (state.once && (entered || state.initial)))
        return

      const onEnter = () => {
        entered = true
        setInView(true)
        return state.once ? undefined : () => {
          entered = false
          setInView(false)
        }
      }
      return inView(state.el, onEnter, {
        root: state.root,
        margin: state.margin,
        amount: state.amount,
      } as any)
    },
  )

  return isInView
}
