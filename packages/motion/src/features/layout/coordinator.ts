import type { IProjectionNode, NodeGroup } from 'motion-dom'
import { layoutRefresh } from '@/components/context'
import { mountedStates } from '@/state/motion-state'

/**
 * Layout coordinator: makes plain `layout` / `layoutId` components animate when their
 * layout changes as a consequence of something happening elsewhere in the tree.
 *
 * React re-renders every layout component under a parent that re-renders, so each one takes
 * a snapshot in `getSnapshotBeforeUpdate`. Solid never re-renders siblings: `<For>` moves
 * DOM nodes, `<Show>` inserts or removes one, a signal grows an accordion. Nothing runs
 * before those DOM writes, and Solid has no supported pre-flush seam (`onFlush` runs after
 * the flush, `setWriteHook` is an internal single-slot hook). So the "before" snapshot is the
 * last layout the projection tree measured (`node.layout`), and the change is detected after
 * the fact with observers:
 *
 * - one `MutationObserver` for child list changes and layout-affecting attribute changes,
 * - one `ResizeObserver` over the layout nodes and their parents (container resize, grid
 *   reflow, text changes).
 *
 * Both fire before the browser paints. The callback feeds the cached layout into each node as
 * its snapshot and asks the projection root to update, which measures the new layout and
 * animates the difference, exactly as after a React render. When nothing moved the
 * deltas are zero and nothing animates.
 *
 * Nothing is observed while no layout component is mounted, observers are disconnected when
 * the last one unmounts, and nothing runs per frame: only a DOM change triggers one batched
 * measure. Motion's own style writes (transforms, opacity, ...) are ignored, so a running
 * animation does not trigger layout updates.
 */

const nodes = new Set<IProjectionNode>()
/** How many registered nodes observe an element (itself or as a parent). */
const observed = new Map<Element, number>()
const resizeSeen = new WeakSet<Element>()
const snapshotIds = new WeakMap<IProjectionNode, number>()

let mutationObserver: MutationObserver | undefined
let resizeObserver: ResizeObserver | undefined
let seedScheduled = false

/** Style properties motion writes on its own; changing only these never moves other elements. */
const PAINT_ONLY = /^(?:transform|transform-origin|transform-box|will-change|opacity|filter|clip-path|color|background(?:-.*)?|box-shadow|border-(?:top|bottom)-(?:left|right)-radius|border-radius|pointer-events|user-select|-webkit-user-select|-webkit-touch-callout|touch-action|cursor|visibility|fill|stroke(?:-.*)?|--.*)$/

function parseStyle(text: string | null): Map<string, string> {
  const map = new Map<string, string>()
  if (!text)
    return map
  for (const declaration of text.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon > 0)
      map.set(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim())
  }
  return map
}

/** True when the style of a motion-managed element changed in a way that can move other elements. */
function styleChangeAffectsLayout(target: Element, oldValue: string | null): boolean {
  const before = parseStyle(oldValue)
  const after = parseStyle(target.getAttribute('style'))
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(key) !== after.get(key) && !PAINT_ONLY.test(key))
      return true
  }
  return false
}

function isRelevant(records: MutationRecord[]): boolean {
  for (const record of records) {
    if (record.type === 'childList')
      return true
    const target = record.target as Element
    if (record.attributeName === 'style' && mountedStates.has(target)) {
      // Motion writes style every frame; only a layout-affecting user change counts.
      if (styleChangeAffectsLayout(target, record.oldValue))
        return true
      continue
    }
    return true
  }
  return false
}

function copyBox(box: any) {
  return { x: { ...box.x }, y: { ...box.y } }
}

/** A node takes part when it is a present layout node that did not opt out with `layoutDependency`. */
function isEligible(node: any): boolean {
  const options = node.options
  if (!node.instance?.isConnected || !(options.layout || options.layoutId))
    return false
  // The projection options do not carry it: read it from the component's props.
  if (options.visualElement?.getProps().layoutDependency !== undefined)
    return false
  if (node.isPresent === false)
    return false
  return !options.layoutId || node.isLead()
}

/**
 * Snapshot a node from its last measured layout. `willUpdate` measures the DOM as it is now
 * (already changed); the cached layout replaces that measurement as the "before" box.
 */
function prepare(node: any) {
  if (node.isLayoutDirty)
    return // already snapshotted before the DOM changed (own update path)
  const previous = node.layout
  node.willUpdate()
  const snapshot = node.snapshot
  if (!snapshot || !previous)
    return
  // A node that is still animating is visually at its projection target, not at its layout.
  const running = node.currentAnimation?.state === 'running' && node.target
  snapshot.layoutBox = copyBox(running ? node.target : previous.layoutBox)
  snapshot.measuredBox = copyBox(running ? node.target : previous.measuredBox)
}

function roots() {
  const set = new Set<any>()
  nodes.forEach(node => node.root && set.add(node.root))
  return set
}

/** After a DOM change: snapshot every eligible node from its cached layout and update. */
function update(onlyUnmeasured = false, group?: NodeGroup) {
  if (!nodes.size)
    return
  roots().forEach((root) => {
    if (root.isUpdateBlocked())
      return
    let any = false
    nodes.forEach((node: any) => {
      if (node.root !== root || !isEligible(node))
        return
      if (onlyUnmeasured && node.layout)
        return
      if (group && node.options.visualElement?.getProps().layoutGroup?.group !== group)
        return
      any = true
      prepare(node)
    })
    if (any)
      root.didUpdate()
  })
}

function onMutations(records: MutationRecord[]) {
  if (isRelevant(records))
    update()
}

function onResize(entries: ResizeObserverEntry[]) {
  let changed = false
  for (const entry of entries) {
    // The first notification is the initial observation, not a change.
    if (resizeSeen.has(entry.target))
      changed = true
    else
      resizeSeen.add(entry.target)
  }
  if (changed)
    update()
}

function observe(element: Element) {
  observed.set(element, (observed.get(element) ?? 0) + 1)
  if (observed.get(element) === 1)
    resizeObserver?.observe(element)
}

function unobserve(element: Element) {
  const count = (observed.get(element) ?? 1) - 1
  if (count > 0) {
    observed.set(element, count)
    return
  }
  observed.delete(element)
  resizeSeen.delete(element)
  resizeObserver?.unobserve(element)
}

function start() {
  if (typeof document === 'undefined')
    return
  if (!mutationObserver && typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(onMutations)
    mutationObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class', 'style', 'hidden', 'open', 'width', 'height'],
    })
  }
  if (!resizeObserver && typeof ResizeObserver !== 'undefined')
    resizeObserver = new ResizeObserver(onResize)
}

function stop() {
  mutationObserver?.disconnect()
  resizeObserver?.disconnect()
  mutationObserver = undefined
  resizeObserver = undefined
}

/**
 * Register a mounted layout node. Returns the function that unregisters it; the observers
 * are created with the first node and disconnected with the last.
 */
export function registerLayoutNode(node: IProjectionNode, element: Element): () => void {
  if (nodes.has(node))
    return () => {}
  nodes.add(node)
  layoutRefresh.run = refreshLayout
  start()
  const parent = element.parentElement
  observe(element)
  if (parent)
    observe(parent)
  // The first measurement of a node has to exist before the first change to animate from.
  if (!seedScheduled) {
    seedScheduled = true
    queueMicrotask(() => {
      seedScheduled = false
      update(true)
    })
  }
  return () => {
    if (!nodes.delete(node))
      return
    unobserve(element)
    if (parent)
      unobserve(parent)
    if (!nodes.size)
      stop()
  }
}

/**
 * Snapshot every other layout node now, while the DOM still shows the old layout, as React
 * does for all layout components under a re-rendering parent. Called when a layout node
 * updates or unmounts; the following DOM change (and the observers) finish the update.
 */
export function snapshotLayoutSiblings(source: IProjectionNode) {
  const root: any = source.root
  if (!root || root.isUpdateBlocked())
    return
  // One snapshot pass per update batch (`animationId` changes with every `startUpdate`).
  if (snapshotIds.get(root) === root.animationId)
    return
  nodes.forEach((node: any) => {
    if (node !== source && node.root === root && isEligible(node) && !node.isLayoutDirty)
      node.willUpdate()
  })
  snapshotIds.set(root, root.animationId)
}

/**
 * Re-run layout for every layout component after the next DOM change that the observers
 * cannot see (for example a layout-affecting class set through a stylesheet). This is what
 * `forceRender` calls.
 */
export function refreshLayout(group?: NodeGroup) {
  queueMicrotask(() => update(false, group))
}
