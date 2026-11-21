import type { Accessor } from 'solid-js'
import { createEffect, createSignal } from 'solid-js'

/**
 * Accessor that is `true` while the page (tab) is visible.
 *
 * Implemented locally rather than with `@solid-primitives/page-utilities`' `createPageVisibility`:
 * that one creates a hydratable signal and listener only on the client, which shifts the
 * hydration ids of everything created after it. Here the same primitives are created on the
 * server and the client, and the document is only read in the effect (client only).
 */
export function createPageInView(): Accessor<boolean> {
  const [visible, setVisible] = createSignal(true)

  createEffect(
    () => {},
    () => {
      const update = () => setVisible(document.visibilityState === 'visible')
      update()
      document.addEventListener('visibilitychange', update)
      return () => document.removeEventListener('visibilitychange', update)
    },
  )

  return visible
}
