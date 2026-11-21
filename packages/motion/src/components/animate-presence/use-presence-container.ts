import { createRenderEffect, onCleanup, onSettled } from 'solid-js'
import type { AnimatePresenceProps } from './types'
import { useMotionConfig } from '@/components/motion-config/context'
import { useLayoutGroupContext } from '@/components/context'
import { createExitSession } from './exit-session'
import type { PresenceContext } from './presence'

/**
 * The state shared by one `AnimatePresence`: the exit session (registries, exit batching,
 * pop-layout pinning) and the `PresenceContext` its descendants register with.
 */
export function createPresenceContainer(props: AnimatePresenceProps) {
  const motionConfig = useMotionConfig()
  const layoutGroup = useLayoutGroupContext()

  const session = createExitSession({
    props,
    getNonce: () => motionConfig().nonce,
    onAllComplete: () => {
      // Surrounding layout components re-measure now that the exited children are gone.
      if (props.presenceAffectsLayout !== false)
        layoutGroup.forceRender?.()
      props.onExitComplete?.()
    },
  })

  // `initial` and `custom` are getters, so consumers read the live props inside their own
  // tracking scopes. `initial` only applies to children present on the first render.
  let hasMounted = false
  // `custom` is also read untracked (an exit started from an effect callback resolves dynamic
  // variants with it), so it is mirrored into a plain field by a tracked effect.
  let custom: unknown
  createRenderEffect(() => props.custom, (value) => {
    custom = value
  })
  const context: PresenceContext = {
    get initial() {
      return hasMounted ? undefined : props.initial
    },
    get custom() {
      return custom
    },
    register: session.register,
    unregister: session.unregister,
    registerHandler: session.registerHandler,
    unregisterHandler: session.unregisterHandler,
    isChild: session.isChild,
  }

  onSettled(() => {
    hasMounted = true
  })

  onCleanup(() => {
    if (props.propagate) {
      // The parent starts this presence's exit right after this owner is disposed.
      queueMicrotask(session.disposeAfterExits)
    }
    else {
      session.dispose()
    }
  })

  return { session, context }
}
