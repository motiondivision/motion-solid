import type { Accessor } from 'solid-js'
import { createMutationObserver } from '@solid-primitives/mutation-observer'
import { createEffect, onCleanup, onSettled, omit } from 'solid-js'
import type { AnimateViewHandle } from './context'
import {
  cancelViewTransitionAnimation,
  getActiveViewTransition,
  recordParticipant,
  registerAnimateView,
  unregisterAnimateView,
} from './context'
import { injectViewTransitionResetStyles } from './reset-styles'
import type { AnimateViewProps } from './types'

let uidCounter = 0

/** charCode of 'a' — suffix base for multi-root layer names (`uid-a`, `uid-b`, …) */
const SUFFIX_A = 97

const OBSERVE_INIT: MutationObserverInit = {
  subtree: true,
  childList: true,
  attributes: true,
  characterData: true,
}

/**
 * Register the current `<AnimateView>` with the view transition registry and
 * wire up lifecycle-based participation detection.
 *
 * `elements` is the accessor of the component's resolved root elements (text
 * and comment nodes excluded).
 *
 * Names are applied lazily: `startTransition` applies layer names on every
 * mounted instance right before the DOM update, and entering instances apply
 * their own on mount. Outside a transition no `view-transition-name` is
 * written, so idle instances never interfere with other transitions.
 *
 * Participation mapping from Vue/React:
 * - mount (`onSettled` inside an active transition): `enter`
 * - cleanup (disposed inside an active transition): `exit`
 * - root elements changed (effect) or DOM mutated inside the roots between
 *   `applyLayerNames` and the end of the update (MutationObserver records,
 *   read synchronously): `update`
 */
export function createAnimateView(
  props: AnimateViewProps,
  elements: Accessor<Element[]>,
): void {
  const uid = `motion-view-${++uidCounter}`
  const ownProps = omit(props as AnimateViewProps & { children?: unknown }, 'children')

  let layerNames: string[] = []
  let layerElements: Element[] = []
  // Whether the observer currently watches the layer elements (it starts out idle: no initial targets).
  let observing = false
  let mounted = false
  let mutated = false

  function computeLayerNames(count: number): string[] {
    const name = props.name ?? uid
    if (count <= 1)
      return [name]

    // Mirror React's suffixed auto-names for multi-root boundaries
    return Array.from({ length: count }, (_, i) => `${name}-${String.fromCharCode(SUFFIX_A + i)}`)
  }

  // The primitive's own settle/cleanup hooks only manage the (empty) initial targets; the layer
  // elements are added and dropped by hand because they change on every transition.
  const [observe, { stop, instance: observer }] = createMutationObserver([], OBSERVE_INIT, () => {
    mutated = true
  })

  function stopObserving(): void {
    stop()
    observing = false
  }

  function applyLayerNames(): void {
    removeLayerNames()

    layerElements = [...elements()]
    layerNames = computeLayerNames(layerElements.length)

    layerElements.forEach((el, i) => {
      (el as HTMLElement).style.setProperty('view-transition-name', layerNames[i])
    })

    // Observe after the names are written so they don't count as an update
    for (const el of layerElements)
      observe(el)
    observing = layerElements.length > 0
  }

  function removeLayerNames(): void {
    stopObserving()
    mutated = false
    for (const el of layerElements) {
      (el as HTMLElement).style.removeProperty('view-transition-name')
    }
    layerElements = []
    layerNames = []
  }

  const handle: AnimateViewHandle = {
    uid,
    get layerNames() {
      return layerNames
    },
    applyLayerNames,
    removeLayerNames,
    detectUpdate() {
      if (!observing || !observer || !getActiveViewTransition())
        return
      // Records are delivered on a microtask, which may already have run
      // (flag set) or still be pending (takeRecords drains them synchronously).
      if (mutated || observer.takeRecords().length > 0)
        recordParticipant('update', handle)
    },
    // Spread, don't enumerate: any prop added to `AnimateViewProps` later is
    // captured automatically, so exit-time snapshots can't silently drop it.
    getProps: () => ({ ...ownProps }) as AnimateViewProps,
    getShareName: () => props.name,
  }

  // Root elements replaced (conditional children, keyed swaps): re-apply
  // names before the new snapshot and record an update.
  createEffect(
    () => elements(),
    () => {
      if (!mounted || !getActiveViewTransition())
        return
      applyLayerNames()
      recordParticipant('update', handle)
    },
    { defer: true },
  )

  onSettled(() => {
    mounted = true
    injectViewTransitionResetStyles()
    registerAnimateView(handle)

    // Mounted inside an active transition's update: this instance is entering
    if (getActiveViewTransition()) {
      applyLayerNames()
      recordParticipant('enter', handle)
    }
  })

  onCleanup(() => {
    // The element still carries its layer name, so the browser has captured
    // it in the old snapshot and will generate an exit pair
    if (getActiveViewTransition()) {
      recordParticipant('exit', handle)
    }
    mounted = false
    unregisterAnimateView(handle)
    // Cancel any layer animation still playing for this instance (no-op for
    // exits — their cleanup is only stored at `ready`, after unmount)
    cancelViewTransitionAnimation(handle)
    removeLayerNames()
  })
}
