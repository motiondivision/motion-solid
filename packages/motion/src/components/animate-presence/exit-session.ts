import { frame } from 'motion-dom'
import type { MotionState } from '@/state'
import type { ExitFeature } from '@/features/exit/exit'
import type { AnimatePresenceProps } from './types'
import type { PresenceHandler } from './presence'
import { afterFlush } from '@/utils/after-flush'

export interface ExitSessionConfig {
  // Read lazily at track time, since these are reactive props
  props: Pick<AnimatePresenceProps, 'mode' | 'anchorX' | 'anchorY' | 'root'>
  getNonce: () => string | undefined
  onAllComplete: () => void
}

interface ExitSession {
  el: HTMLElement
  states: Set<MotionState>
  handlers: Set<PresenceHandler>
  /**
   * The latest leave callback for this element; a duplicate leave replaces it. It may return a
   * promise that settles once the element has actually left the DOM (`wait` swaps the child
   * in a later flush).
   */
  done: () => void | Promise<void>
  /** Completions still awaited before this element can leave the DOM. */
  pending: number
  active: boolean
  popStyle?: HTMLStyleElement
}

let popId = 0

/**
 * A set of items located by the DOM element they own. The leaving subtree is
 * exactly the container's descendants, so discovery filters the registry by
 * reference containment instead of querying the DOM. inject resolves to the
 * nearest ancestor, so nested AnimatePresence instances scope correctly
 * without DOM attribute tagging.
 */
function createRegistry<T>(elementOf: (item: T) => Element | null | undefined) {
  const items = new Set<T>()
  return {
    add: (item: T) => {
      items.add(item)
    },
    remove: (item: T) => {
      items.delete(item)
    },
    find(container: Element) {
      const found: T[] = []
      for (const item of items) {
        const el = elementOf(item)
        if (el && (el === container || container.contains(el)))
          found.push(item)
      }
      return found
    },
    all: () => Array.from(items),
    clear: () => {
      items.clear()
    },
  }
}

/**
 * Bookkeeping for AnimatePresence exits. One instance owns the registered
 * motion states and presence handlers, at most one live session per exiting
 * element, and the batch that fans `onExitComplete` in.
 *
 * A duplicate leave for the same element joins the live session: it keeps the
 * original exit running, adopts the latest removal callback, and adds any
 * newly discovered children. This is the shape a transition group
 * hands us. A second leave overwrites the element's leave callback without
 * cancelling the first.
 */
export function createExitSession(config: ExitSessionConfig) {
  const states = createRegistry<MotionState>(state => state.element)
  const handlers = createRegistry<PresenceHandler>(handler => handler.element())
  const children = new WeakSet<Element>()
  const sessions = new Map<HTMLElement, ExitSession>()
  let batchOpen = false
  let anyFinished = false
  let disposeRequested = false

  // ===== Pop layout =====

  function addPopStyle(session: ExitSession) {
    if (config.props.mode !== 'popLayout')
      return

    const element = session.el
    const parent = element.offsetParent
    const parentWidth = parent instanceof HTMLElement ? parent.offsetWidth || 0 : 0
    const parentHeight = parent instanceof HTMLElement ? parent.offsetHeight || 0 : 0
    const size = {
      height: element.offsetHeight || 0,
      width: element.offsetWidth || 0,
      top: element.offsetTop,
      left: element.offsetLeft,
      right: 0,
      bottom: 0,
    }
    size.right = parentWidth - size.width - size.left
    size.bottom = parentHeight - size.height - size.top
    const isRTL = (element.ownerDocument.defaultView ?? window).getComputedStyle(element).direction === 'rtl'
    const anchorX = config.props.anchorX ?? 'left'
    const x = anchorX === 'left'
      ? (isRTL ? `right: ${size.right}px` : `left: ${size.left}px`)
      : (isRTL ? `left: ${size.left}px` : `right: ${size.right}px`)
    const y = config.props.anchorY === 'bottom' ? `bottom: ${size.bottom}px` : `top: ${size.top}px`

    // Use unique pop id for CSS selector
    const elementPopId = `pop-${popId++}`
    element.dataset.motionPopId = elementPopId
    // Use the element's own document so popLayout works when the tree
    // renders into another window or iframe
    const doc = element.ownerDocument
    const style = doc.createElement('style')
    const nonce = config.getNonce()
    if (nonce) {
      style.nonce = nonce
    }
    session.popStyle = style
    const styleParent = config.props.root ?? doc.head
    styleParent.appendChild(style)
    if (style.sheet) {
      style.sheet.insertRule(`
    [data-motion-pop-id="${elementPopId}"] {
      position: absolute !important;
      width: ${size.width}px !important;
      height: ${size.height}px !important;
      ${y} !important;
      ${x} !important;
      }
      `)
    }
  }

  function removePopStyle(session: ExitSession) {
    const style = session.popStyle
    if (!style)
      return
    session.popStyle = undefined
    frame.render(() => {
      style.parentNode?.removeChild(style)
    })
  }

  // ===== Session lifecycle =====

  function track(el: HTMLElement, done: () => void | Promise<void>) {
    let session = sessions.get(el)
    if (session) {
      // A duplicate leave owns the latest removal callback.
      session.done = done
    }
    else {
      if (sessions.size === 0) {
        batchOpen = true
        anyFinished = false
      }
      session = {
        el,
        states: new Set(),
        handlers: new Set(),
        done,
        pending: 0,
        active: true,
      }
      sessions.set(el, session)
      addPopStyle(session)
    }

    for (const state of states.find(el)) {
      if (session.states.has(state))
        continue
      session.states.add(state)
      session.pending++
      const completion = state.getFeature<ExitFeature>('exit')?.exit() ?? Promise.resolve()
      completion.then(() => settle(session))
    }

    for (const handler of handlers.find(el)) {
      if (session.handlers.has(handler))
        continue
      session.handlers.add(handler)
      session.pending++
      Promise.resolve(handler.onExit()).then(() => settle(session))
    }

    // A child with nothing to wait for still joins the batch. Defer so sibling
    // leaves in the same patch register before onExitComplete can fire.
    if (session.pending === 0)
      afterFlush(() => finishIfIdle(session))
  }

  function settle(session: ExitSession) {
    if (!session.active)
      return
    session.pending--
    finishIfIdle(session)
  }

  function finishIfIdle(session: ExitSession) {
    if (session.active && session.pending === 0)
      finish(session)
  }

  function finish(session: ExitSession) {
    session.active = false
    if (sessions.get(session.el) === session)
      sessions.delete(session.el)
    anyFinished = true
    removePopStyle(session)
    session.states.forEach((state) => {
      state.getSnapshot(false)
    })
    // Call done to remove DOM
    const landed = session.done()
    const settle = () => {
      if (!session.el.isConnected) {
        session.states.forEach((state) => {
          state.unmount()
        })
      }
      closeBatch()
    }
    if (landed)
      landed.then(settle)
    else
      settle()
  }

  function abort(el: HTMLElement) {
    const session = sessions.get(el)
    if (session)
      cancel(session, true)
  }

  function cancel(session: ExitSession, notifyEnter: boolean) {
    if (!session.active)
      return
    session.active = false
    if (sessions.get(session.el) === session)
      sessions.delete(session.el)
    removePopStyle(session)
    if (notifyEnter)
      session.handlers.forEach(handler => handler.onEnter?.())
    closeBatch()
  }

  // ===== Transition handlers =====

  function enter(el: HTMLElement, done: VoidFunction) {
    children.add(el)
    abort(el)
    states.find(el).forEach((state) => {
      state.getFeature<ExitFeature>('exit')?.reenter()
    })
    done()
  }

  function exit(el: Element, done: () => void | Promise<void>) {
    track(el as HTMLElement, done)
  }

  /**
   * Exit every element at once and resolve when all have finished. Used by a nested
   * `propagate` AnimatePresence, whose own children leave together with their parent child.
   */
  function exitAll(els: Element[]): Promise<void> {
    return Promise.all(els.map(el => new Promise<void>(resolve => track(el as HTMLElement, resolve)))).then(() => {})
  }

  /** The counterpart of `exitAll`: the parent child came back, so its children re-enter. */
  function enterAll(els: Element[]) {
    for (const el of els)
      enter(el as HTMLElement, () => {})
  }

  // ===== Batch =====

  function closeBatch() {
    if (sessions.size > 0)
      return
    if (batchOpen) {
      const fire = anyFinished
      batchOpen = false
      anyFinished = false
      if (fire)
        config.onAllComplete()
    }
    if (disposeRequested)
      disposeNow()
  }

  /**
   * Dispose once the exits in flight have finished. For a `propagate` presence whose owner is
   * gone because its parent child is leaving: the parent drives its exit after the disposal,
   * and the owners of its motion elements can no longer unmount them.
   */
  function disposeAfterExits() {
    if (sessions.size === 0)
      disposeNow()
    else
      disposeRequested = true
  }

  function disposeNow() {
    const remaining = states.all()
    dispose()
    for (const state of remaining) {
      if (state.isMounted())
        state.unmount()
    }
  }

  function dispose() {
    disposeRequested = false
    // Container teardown never reports exit completion, and cancelling first
    // stops in-flight promises from finalizing after the tree is gone.
    batchOpen = false
    anyFinished = false
    for (const session of Array.from(sessions.values())) {
      cancel(session, false)
      session.states.forEach((state) => {
        state.unmount()
      })
    }
    sessions.clear()
    states.clear()
    handlers.clear()
  }

  return {
    register: states.add,
    unregister: states.remove,
    registerHandler: handlers.add,
    unregisterHandler: handlers.remove,
    isChild: (el: Element) => children.has(el),
    enter,
    exit,
    exitAll,
    enterAll,
    dispose,
    disposeAfterExits,
  }
}
