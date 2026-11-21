import type { Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { children, createMemo, createRenderEffect, flush, onSettled, Show } from 'solid-js'
import { dynamic, isServer } from '@solidjs/web'
import { createListTransition, createSwitchTransition } from '@solid-primitives/transition-group'
import { noop } from '@solid-primitives/utils'
import { createPresenceContainer } from './use-presence-container'
import { AnimatePresenceContext } from './presence'
import type { PresenceContext } from './presence'
import { createPresence } from './use-presence'
import type { createExitSession } from './exit-session'
import type { AnimatePresenceProps } from './types'

type ExitSession = ReturnType<typeof createExitSession>

/**
 * One rendered child. Identity is the DOM node Solid hands us for a child. A node that comes
 * back while its previous entry is still exiting gets a fresh entry, so the transition list
 * can retire the old one without ever reporting a second removal for the same object.
 */
interface Entry {
  node: Node
  exiting: boolean
}

const isElement = (node: unknown): node is Element => typeof Element !== 'undefined' && node instanceof Element

/** The nodes this presence currently renders, kept for a `propagate` parent to exit imperatively. */
interface Live {
  nodes: Node[]
}

/**
 * `sync` / `popLayout`: `createListTransition` hosts the retained list of entries; the exit
 * session decides when each removal is done (motion `exit` animations, `createPresence`
 * handlers). Exiting entries keep their index so siblings do not jump.
 */
function ListPresence(props: { nodes: Accessor<Node[]>, session: ExitSession, live: Live }) {
  const entries = new Map<Node, Entry>()
  /** Entries superseded by a fresh entry for the same node while they were still exiting. */
  const superseded = new Set<Entry>()

  const source = createMemo(() =>
    props.nodes().map((node) => {
      let entry = entries.get(node)
      if (!entry || entry.exiting) {
        if (entry)
          superseded.add(entry)
        entry = { node, exiting: false }
        entries.set(node, entry)
      }
      return entry
    }),
  )

  const rendered = createListTransition(source, {
    exitMethod: 'keep-index',
    onChange({ added, removed, finishRemoved }) {
      for (const entry of added) {
        if (isElement(entry.node))
          props.session.enter(entry.node as HTMLElement, noop)
      }
      if (superseded.size) {
        // The node came back mid-exit: its session was cancelled by `enter`, so retire the old entry.
        const stale = [...superseded]
        superseded.clear()
        finishRemoved(stale)
      }

      for (const entry of removed) {
        entry.exiting = true
        const finish = () => {
          if (entries.get(entry.node) === entry)
            entries.delete(entry.node)
          finishRemoved([entry])
          // Land the removal now: the exit session checks that the element left the DOM.
          flush()
        }
        if (isElement(entry.node))
          props.session.exit(entry.node, finish)
        else
          finish()
      }
    },
  })

  const out = createMemo(() => {
    const nodes = [...new Set(rendered().map(entry => entry.node))]
    props.live.nodes = nodes
    return nodes
  })

  return out as unknown as JSX.Element
}

/**
 * `wait`: `createSwitchTransition` in `out-in` mode, so the entering child is only inserted
 * once the exiting one is gone. Only the first element child takes part, as in React.
 */
function WaitPresence(props: { nodes: Accessor<Node[]>, session: ExitSession, live: Live }) {
  const current = createMemo(() => props.nodes().find(isElement) ?? props.nodes()[0])

  const rendered = createSwitchTransition(current, {
    mode: 'out-in',
    onEnter(node, done) {
      if (isElement(node))
        props.session.enter(node as HTMLElement, done)
      else
        done()
    },
    onExit(node, done) {
      // Text has no exit: it leaves at once.
      if (!isElement(node))
        return done()
      props.session.exit(node, () => {
        done()
        flush()
      })
    },
  })

  const out = createMemo(() => {
    const nodes = rendered()
    props.live.nodes = nodes
    return nodes
  })

  return out as unknown as JSX.Element
}

function Passthrough(props: { children?: JSX.Element }) {
  return props.children
}

/**
 * Strings and numbers become text nodes. They have no exit animation, so they are removed
 * immediately. A text node is reused while its value stays among the children.
 */
function createNodeResolver() {
  let pool = new Map<string, Text[]>()
  return (items: unknown[]): Node[] => {
    const next = new Map<string, Text[]>()
    const nodes: Node[] = []
    for (const item of items) {
      if (item instanceof Node) {
        nodes.push(item)
      }
      else if (typeof item === 'string' || typeof item === 'number') {
        const value = String(item)
        const text = pool.get(value)?.shift() ?? document.createTextNode(value)
        const list = next.get(value)
        if (list)
          list.push(text)
        else
          next.set(value, [text])
        nodes.push(text)
      }
    }
    pool = next
    return nodes
  }
}

function PresenceChildren(props: {
  session: ExitSession
  live: Live
  mode: AnimatePresenceProps['mode']
  as: AnimatePresenceProps['as']
  children: JSX.Element
}) {
  // Resolved below the provider, so motion components in the children see the presence context.
  const resolved = children(() => props.children)
  const resolveNodes = createNodeResolver()
  const nodes = createMemo(() => resolveNodes(resolved.toArray()))
  const isWait = createMemo(() => props.mode === 'wait')
  const Wrapper = dynamic(() => props.as ?? Passthrough)

  return (
    <Wrapper>
      <Show when={isWait()} fallback={<ListPresence nodes={nodes} session={props.session} live={props.live} />}>
        <WaitPresence nodes={nodes} session={props.session} live={props.live} />
      </Show>
    </Wrapper>
  )
}

/**
 * Server render: there is nothing to animate, so children render once inside the presence
 * context (`initial` and `custom` still apply to them) with no transition layer and no DOM.
 *
 * Hydration ids come from the owner tree, so this allocates the same id-bearing primitives, in
 * the same order and nesting, as the client's container and `PresenceChildren`. Keep the two in
 * step: a different count shifts every id below and the client can no longer claim the server nodes.
 */
function ServerPresenceChildren(props: { mode: AnimatePresenceProps['mode'], as: AnimatePresenceProps['as'], children: JSX.Element }) {
  const resolved = children(() => props.children)
  const nodes = createMemo(() => resolved.toArray())
  createMemo(() => props.mode === 'wait')
  const Wrapper = dynamic(() => props.as ?? Passthrough)
  return <Wrapper>{nodes() as unknown as JSX.Element}</Wrapper>
}

function ServerAnimatePresence(props: AnimatePresenceProps): JSX.Element {
  const context: PresenceContext = {
    get initial() {
      return props.initial
    },
    get custom() {
      return props.custom
    },
    registerHandler: noop,
    unregisterHandler: noop,
  }
  createRenderEffect(() => props.custom, noop)
  onSettled(noop)
  createPresence({ element: () => null })
  return (
    <AnimatePresenceContext value={context}>
      <ServerPresenceChildren mode={props.mode} as={props.as}>{props.children}</ServerPresenceChildren>
    </AnimatePresenceContext>
  )
}

/**
 * Animates children out when they are removed, and (with `mode`) coordinates how entering and
 * exiting children overlap. Children opt in with `exit` on `motion` components, or with
 * `createPresence`.
 *
 * Children are keyed by identity: a keyed `For` item or a `Show` branch exits when it is
 * removed, and the same node coming back mid-exit re-enters instead of starting over.
 * Strings and numbers render as text and leave immediately.
 */
export function AnimatePresence(props: AnimatePresenceProps): JSX.Element {
  if (isServer)
    return ServerAnimatePresence(props)

  const { session, context } = createPresenceContainer(props)
  const live: Live = { nodes: [] }

  // With `propagate`, this presence is held by the enclosing presence's exit: when the child
  // containing it leaves, its own children exit too, and the parent waits for them. The
  // parent's owner is already disposed by then, so this runs imperatively through the session.
  // It is a no-op for a presence that is not nested or does not set `propagate`.
  let anchor: Element | undefined
  createPresence({
    element: () => {
      if (!props.propagate)
        return null
      anchor = live.nodes.find(isElement) ?? anchor
      return anchor
    },
    onExit: () => session.exitAll(live.nodes.filter(isElement)),
    onEnter: () => session.enterAll(live.nodes.filter(isElement)),
  })

  return (
    <AnimatePresenceContext value={context}>
      <PresenceChildren session={session} live={live} mode={props.mode} as={props.as}>
        {props.children}
      </PresenceChildren>
    </AnimatePresenceContext>
  )
}
