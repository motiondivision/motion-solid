import type { Accessor } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { children, createEffect, createMemo, createRenderEffect, flush, isPending, Loading, onSettled } from 'solid-js'
import { dynamic, isServer } from '@solidjs/web'
import { createListTransition } from '@solid-primitives/transition-group'
import { noop } from '@solid-primitives/utils'
import { warning } from 'motion-utils'
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
function ListPresence(props: { children: JSX.Element, session: ExitSession, live: Live, syncCustom: VoidFunction }) {
  const nodes = createNodeResolver(() => props.children)
  const entries = new Map<Node, Entry>()
  /** Entries superseded by a fresh entry for the same node while they were still exiting. */
  const superseded = new Set<Entry>()

  const source = createMemo(() => {
    props.syncCustom()
    return nodes().map((node) => {
      let entry = entries.get(node)
      if (!entry || entry.exiting) {
        if (entry)
          superseded.add(entry)
        entry = { node, exiting: false }
        entries.set(node, entry)
      }
      return entry
    })
  })

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
 * `wait`: the entering child is not shown until the exiting one has left, and nothing it
 * schedules runs before that. Only the first element child takes part, as in React.
 *
 * Children are resolved inside a `Loading` boundary and the displayed node is an async memo
 * that stays pending while the exit runs. Solid keeps the old node on screen and holds every
 * effect, `onSettled` and ref-driven mount of the new subtree behind the boundary until the
 * memo settles, then attaches the new node and releases them, so they run against a connected
 * element, as they do in React where the entering child is not rendered until the old one is
 * removed. (Component bodies run when the source signal changes: Solid has no way to defer a
 * `Show` branch's body, only what it schedules.)
 */
function WaitPresence(props: { children: JSX.Element, session: ExitSession, live: Live, syncCustom: VoidFunction }) {
  const nodes = createNodeResolver(() => props.children)
  const current = createMemo(() => nodes().find(isElement) ?? nodes()[0])
  // React warns here because only one child can wait for another.
  createEffect(
    () => nodes().filter(isElement).length > 1,
    (many) => {
      warning(!many, 'You\'re attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour.')
    },
  )
  /** The node on screen. It stays the leaving node while its exit runs. */
  let displayed: Node | undefined
  /** The swap waiting on the leaving node's exit, if any. */
  let swap: { prev: HTMLElement, next: Node | undefined, resolve: (node: Node | undefined) => void } | undefined
  /** Resolvers for exits waiting on the new node to be attached. */
  let landed: VoidFunction[] = []

  const shown = createMemo((): Node | undefined | Promise<Node | undefined> => {
    const next = current()
    const prev = displayed
    if (next === prev) {
      swap = undefined
      return next
    }
    if (!prev || !isElement(prev)) {
      // Nothing to wait for: text has no exit.
      displayed = next
      return next
    }
    // Pending until the effect below has run the exit; a newer change replaces the swap and
    // leaves the earlier promise behind.
    return new Promise<Node | undefined>((resolve) => {
      swap = { prev: prev as HTMLElement, next, resolve }
    })
  })

  // Runs the exit while the swap is pending. Its pending read is also what makes the hold
  // visible to Solid: the leaving child animating out is the on-screen answer to the change.
  createEffect(
    () => {
      props.syncCustom()
      return { pending: isPending(shown), next: current() }
    },
    ({ pending, next }) => {
      if (pending && swap) {
        const request = swap
        props.session.exit(request.prev, () => {
          // Hand the slot over, and report back once the new node is attached so the exit
          // session can tell the leaving element is gone.
          displayed = request.next
          request.resolve(request.next)
          return new Promise<void>(done => landed.push(done))
        })
      }
      else if (!pending && next && next === displayed && isElement(next)) {
        // The node came back while it was leaving.
        props.session.enter(next as HTMLElement, noop)
      }
    },
  )

  createEffect(shown, (node) => {
    if (node && isElement(node))
      props.session.enter(node as HTMLElement, noop)
    const waiting = landed
    landed = []
    for (const done of waiting)
      done()
  })

  createRenderEffect(shown, (node) => {
    props.live.nodes = node ? [node as Node] : []
  })

  return shown as unknown as JSX.Element
}

function Passthrough(props: { children?: JSX.Element }) {
  return props.children
}

/**
 * Resolves the children to DOM nodes. Strings and numbers become text nodes, which have no
 * exit animation and are removed immediately. A text node is reused while its value stays
 * among the children.
 */
function createNodeResolver(source: () => JSX.Element): Accessor<Node[]> {
  const resolved = children(source)
  let pool = new Map<string, Text[]>()
  return createMemo(() => {
    const next = new Map<string, Text[]>()
    const nodes: Node[] = []
    for (const item of resolved.toArray()) {
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
  })
}

function PresenceChildren(props: {
  session: ExitSession
  live: Live
  syncCustom: VoidFunction
  mode: AnimatePresenceProps['mode']
  as: AnimatePresenceProps['as']
  children: JSX.Element
}) {
  const isWait = createMemo(() => props.mode === 'wait')
  const Wrapper = dynamic(() => props.as ?? Passthrough)

  // Each branch resolves the children itself, below the provider so motion components see the
  // presence context, and inside the boundary `wait` needs to hold what the entering child schedules.
  const branch = createMemo(() => isWait()
    ? <Loading><WaitPresence session={props.session} live={props.live} syncCustom={props.syncCustom}>{props.children}</WaitPresence></Loading>
    : <ListPresence session={props.session} live={props.live} syncCustom={props.syncCustom}>{props.children}</ListPresence>)

  return <Wrapper>{branch as unknown as JSX.Element}</Wrapper>
}

/**
 * Server render: there is nothing to animate, so children render once inside the presence
 * context (`initial` and `custom` still apply to them) with no transition layer and no DOM.
 *
 * Hydration ids come from the owner tree, so this allocates the same id-bearing primitives, in
 * the same order and nesting, as the client's container and `PresenceChildren`. Keep the two in
 * step: a different count shifts every id below and the client can no longer claim the server nodes.
 */
function ServerBranch(props: { children: JSX.Element }) {
  const resolved = children(() => props.children)
  const nodes = createMemo(() => resolved.toArray())
  return nodes as unknown as JSX.Element
}

function ServerPresenceChildren(props: { mode: AnimatePresenceProps['mode'], as: AnimatePresenceProps['as'], children: JSX.Element }) {
  const isWait = createMemo(() => props.mode === 'wait')
  const Wrapper = dynamic(() => props.as ?? Passthrough)
  const branch = createMemo(() => isWait()
    ? <Loading><ServerBranch>{props.children}</ServerBranch></Loading>
    : <ServerBranch>{props.children}</ServerBranch>)
  return (
    <Wrapper>
      {branch as unknown as JSX.Element}
    </Wrapper>
  )
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

  const { session, context, syncCustom } = createPresenceContainer(props)
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
      <PresenceChildren session={session} live={live} syncCustom={syncCustom} mode={props.mode} as={props.as}>
        {props.children}
      </PresenceChildren>
    </AnimatePresenceContext>
  )
}
