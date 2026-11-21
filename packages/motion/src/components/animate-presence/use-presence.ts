import type { Accessor } from 'solid-js'
import { createSignal, onCleanup, onSettled } from 'solid-js'
import type { PresenceHandler } from './presence'
import { useAnimatePresenceContext } from './presence'

export interface CreatePresenceOptions {
  /** The element whose removal this presence holds. Read after mount and kept. */
  element: Accessor<Element | null | undefined>
  /**
   * Starts the component's own exit; removal waits for the returned promise. Leave it out to
   * finish with the `safeToRemove` callback instead (React's `usePresence` protocol).
   */
  onExit?: () => Promise<unknown> | void
  /** The element came back while its exit was running. */
  onEnter?: () => void
}

function registerPresence(options: CreatePresenceOptions & { hold: boolean }) {
  const presence = useAnimatePresenceContext(null)
  // Written from the exit session, which runs inside AnimatePresence's list memo.
  const [isPresent, setIsPresent] = createSignal(true, { ownedWrite: true })
  let release: VoidFunction | undefined
  let element: Element | null | undefined

  const safeToRemove = () => {
    release?.()
    release = undefined
  }

  // Context is absent outside an AnimatePresence, and the container only exposes the
  // handler registry from `registerHandler`; both mean there is nothing to hold.
  if (!presence?.registerHandler)
    return { isPresent, safeToRemove }

  const handler: PresenceHandler = {
    // A component's owner can be disposed before the leave starts, so keep the last element.
    element: () => options.element() ?? element,
    onExit() {
      setIsPresent(false)
      if (options.onExit)
        return options.onExit()
      if (!options.hold)
        return
      return new Promise<void>((resolve) => {
        release = resolve
      })
    },
    onEnter() {
      release = undefined
      setIsPresent(true)
      options.onEnter?.()
    },
  }

  onSettled(() => {
    element = options.element() ?? element
    presence.registerHandler!(handler)
  })
  // The container discovers handlers while it starts the exit, which happens right after
  // this owner is disposed (in the same flush). Unregister once that has run.
  onCleanup(() => {
    queueMicrotask(() => presence.unregisterHandler!(handler))
  })

  return { isPresent, safeToRemove }
}

/**
 * Lets a component run its own exit when an `AnimatePresence` removes it, for components
 * that animate out without a `motion` element's `exit`.
 *
 * Returns `[isPresent, safeToRemove]` like React's `usePresence`. `isPresent` turns `false`
 * when the exit starts and back to `true` if the element returns mid-exit. Removal waits
 * for `options.onExit`'s promise when given, otherwise for `safeToRemove()`.
 *
 * Outside an `AnimatePresence` it is always present and does nothing.
 */
export function createPresence(options: CreatePresenceOptions): [isPresent: Accessor<boolean>, safeToRemove: VoidFunction] {
  const { isPresent, safeToRemove } = registerPresence({ ...options, hold: true })
  return [isPresent, safeToRemove]
}

/**
 * Whether the element is still present, i.e. not exiting under an `AnimatePresence`.
 * Unlike `createPresence` it never holds the removal. `true` outside an `AnimatePresence`.
 */
export function createIsPresent(element: Accessor<Element | null | undefined>): Accessor<boolean> {
  return registerPresence({ element, hold: false }).isPresent
}

/**
 * The `custom` data of the nearest `AnimatePresence`, as an accessor so changes to the prop
 * are seen. `undefined` outside an `AnimatePresence`.
 */
export function createPresenceData<T = any>(): Accessor<T | undefined> {
  const presence = useAnimatePresenceContext(null)
  return () => presence?.custom
}
