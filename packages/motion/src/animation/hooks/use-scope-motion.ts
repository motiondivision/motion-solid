import type { MotionScope, ScopeOptions, ScopeSetup } from 'motion-dom'
import type { Accessor } from 'solid-js'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { access } from '@solid-primitives/utils'
import { scopeMotion } from 'motion-dom'
import { createEffect, createMemo, createSignal } from 'solid-js'
import type { ElementInput } from '@/utils/use-dom-ref'
import { resolveElementInput } from '@/utils/use-dom-ref'

export type CreateScopeMotionOptions = ScopeOptions

/**
 * Runs `setup` inside a motion scope bound to the element, cancelling it and
 * running it again whenever the element or options change, and on cleanup.
 * Returns an accessor for the current scope.
 */
export function createScopeMotion(
  element: ElementInput,
  setup: ScopeSetup,
  options?: MaybeAccessor<CreateScopeMotionOptions | undefined>,
): Accessor<MotionScope | null> {
  const [scope, setScope] = createSignal<MotionScope | null>(null)
  const el = createMemo(() => resolveElementInput(element))
  const opts = createMemo(() => access(options))

  // Created on the server too (the effect is inert there) so hydration ids line up.
  createEffect(
    () => ({ el: el(), opts: opts() }),
    ({ el, opts }) => {
      const current = scopeMotion(el || undefined as any, setup, opts)
      setScope(current)
      return () => {
        current.cancel()
        setScope(s => (s === current ? null : s))
      }
    },
  )

  return scope
}
