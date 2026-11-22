import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { For, Show, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motion } from '@/components/motion'
import { LayoutGroup } from '@/components/LayoutGroup'
import { createLayoutGroup } from '@/components/use-layout-group'
import { delay } from '@/shared/test'

/**
 * jsdom has no layout. This model stacks the children of every element vertically, in DOM
 * order, from their `data-h` heights (100 by default), so a test moves things by changing
 * the DOM and nothing else. Elements flow left to right and wrap inside a `data-wrap`
 * container whose width is `wrapWidth`.
 */
let wrapWidth = 400

function rectOf(el: Element): { x: number, y: number, width: number, height: number } {
  const styleHeight = parseFloat((el as HTMLElement).style.height)
  const height = Number((el as HTMLElement).dataset.h ?? (Number.isNaN(styleHeight) ? 100 : styleHeight))
  const parent = el.parentElement
  if (!parent)
    return { x: 0, y: 0, width: 100, height }
  if (parent.hasAttribute('data-wrap')) {
    let x = 0
    let y = 0
    for (const sibling of Array.from(parent.children)) {
      if (x + 100 > wrapWidth) {
        x = 0
        y += 100
      }
      if (sibling === el)
        return { x, y, width: 100, height: 100 }
      x += 100
    }
  }
  let y = 0
  for (const sibling of Array.from(parent.children)) {
    if (sibling === el)
      break
    const siblingStyleHeight = parseFloat((sibling as HTMLElement).style.height)
    y += Number((sibling as HTMLElement).dataset.h ?? (Number.isNaN(siblingStyleHeight) ? 100 : siblingStyleHeight))
  }
  const base = rectOf(parent).y
  return { x: 0, y: base + y, width: 100, height }
}

const originalRect = Element.prototype.getBoundingClientRect
const originalRO = (globalThis as any).ResizeObserver
let resizeCallbacks: Array<(entries: any[]) => void> = []
let resizeTargets: Set<Element>

beforeEach(() => {
  wrapWidth = 400
  resizeCallbacks = []
  resizeTargets = new Set()
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const r = rectOf(this)
    return { ...r, top: r.y, left: r.x, right: r.x + r.width, bottom: r.y + r.height, toJSON() {} } as DOMRect
  }
  ;(globalThis as any).ResizeObserver = class {
    constructor(cb: any) {
      resizeCallbacks.push(cb)
    }

    observe(el: Element) {
      resizeTargets.add(el)
    }

    unobserve(el: Element) {
      resizeTargets.delete(el)
    }

    disconnect() {
      resizeTargets.clear()
    }
  }
})

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalRect
  ;(globalThis as any).ResizeObserver = originalRO
})

/** The y of the `translate3d(x, y, z)` motion writes for a projected element (0 when none). */
function translateY(el: Element): number {
  const match = /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec((el as HTMLElement).style.transform)
  return match ? Number(match[2]) : 0
}

function translateX(el: Element): number {
  const match = /translate3d\(([-\d.]+)px/.exec((el as HTMLElement).style.transform)
  return match ? Number(match[1]) : 0
}

const T = { duration: 10, ease: 'linear' as const }

async function settle() {
  flush()
  await delay(60)
}

function List(props: { items: () => string[], wrap?: boolean }) {
  return (
    <div data-testid="list" {...(props.wrap ? { 'data-wrap': '' } : {})}>
      <For each={props.items()}>
        {k => <motion.div layout transition={T} data-k={k} data-testid={k} />}
      </For>
    </div>
  )
}

const get = (r: { container: HTMLElement }, k: string) => r.container.querySelector(`[data-testid="${k}"]`) as HTMLElement

describe('layout coordinator: layout components animate when their layout changes elsewhere', () => {
  it('a <For> reorder FLIPs every moved item from its old position', async () => {
    const [items, setItems] = createSignal(['a', 'b', 'c'])
    const r = render(() => <List items={items} />)
    await settle()
    setItems(['c', 'b', 'a'])
    await settle()
    // c moved from y=200 to y=0, a from 0 to 200, b did not move
    expect(translateY(get(r, 'c'))).toBeGreaterThan(150)
    expect(translateY(get(r, 'a'))).toBeLessThan(-150)
    expect(translateY(get(r, 'b'))).toBe(0)
  })

  it('inserting at the start pushes the existing items from where they were', async () => {
    const [items, setItems] = createSignal(['a', 'b'])
    const r = render(() => <List items={items} />)
    await settle()
    setItems(['z', 'a', 'b'])
    await settle()
    expect(translateY(get(r, 'a'))).toBeLessThan(-50)
    expect(translateY(get(r, 'b'))).toBeLessThan(-50)
    expect(translateY(get(r, 'z'))).toBe(0)
  })

  it('inserting in the middle only moves the items after it', async () => {
    const [items, setItems] = createSignal(['a', 'b', 'c'])
    const r = render(() => <List items={items} />)
    await settle()
    setItems(['a', 'z', 'b', 'c'])
    await settle()
    expect(translateY(get(r, 'a'))).toBe(0)
    expect(translateY(get(r, 'b'))).toBeLessThan(-50)
    expect(translateY(get(r, 'c'))).toBeLessThan(-50)
  })

  it('removing an item moves the items after it', async () => {
    const [items, setItems] = createSignal(['a', 'b', 'c'])
    const r = render(() => <List items={items} />)
    await settle()
    setItems(['a', 'c'])
    await settle()
    expect(translateY(get(r, 'a'))).toBe(0)
    expect(translateY(get(r, 'c'))).toBeGreaterThan(50)
  })

  it('toggling a plain <Show> sibling above animates the layout items', async () => {
    const [show, setShow] = createSignal(false)
    const r = render(() => (
      <div>
        <Show when={show()}><div data-h="80" /></Show>
        <motion.div layout transition={T} data-k="a" data-testid="a" />
      </div>
    ))
    await settle()
    setShow(true)
    await settle()
    expect(translateY(get(r, 'a'))).toBeLessThan(-40)
  })

  it('removing a plain <Show> sibling above animates the layout items up', async () => {
    const [show, setShow] = createSignal(true)
    const r = render(() => (
      <div>
        <Show when={show()}><div data-h="80" /></Show>
        <motion.div layout transition={T} data-k="a" data-testid="a" />
      </div>
    ))
    await settle()
    setShow(false)
    await settle()
    expect(translateY(get(r, 'a'))).toBeGreaterThan(40)
  })

  it('a sibling that grows through a signal (accordion) pushes the layout items smoothly', async () => {
    const [h, setH] = createSignal(40)
    const r = render(() => (
      <div>
        <div style={{ height: `${h()}px` }} data-testid="acc" />
        <motion.div layout transition={T} data-k="a" data-testid="a" />
      </div>
    ))
    await settle()
    setH(160)
    await settle()
    expect(translateY(get(r, 'a'))).toBeLessThan(-80)
  })

  it('a class change that moves the items animates them', async () => {
    const [open, setOpen] = createSignal(false)
    const r = render(() => (
      <div>
        <div class={open() ? 'open' : ''} data-h={open() ? '200' : '50'} />
        <motion.div layout transition={T} data-k="a" data-testid="a" />
      </div>
    ))
    await settle()
    setOpen(true)
    await settle()
    expect(translateY(get(r, 'a'))).toBeLessThan(-100)
  })

  it('a container resize that reflows a grid animates the items', async () => {
    const [items] = createSignal(['a', 'b', 'c', 'd'])
    const r = render(() => <List items={items} wrap />)
    await settle()
    // First ResizeObserver notification is the initial observation.
    const entries = Array.from(resizeTargets).map(target => ({ target }))
    resizeCallbacks.forEach(cb => cb(entries))
    wrapWidth = 200
    resizeCallbacks.forEach(cb => cb(entries))
    await settle()
    // d wrapped from (300, 0) to (100, 100)
    expect(translateX(get(r, 'd'))).toBeGreaterThan(100)
    expect(translateY(get(r, 'd'))).toBeLessThan(-50)
    expect(translateX(get(r, 'a'))).toBe(0)
  })

  it('nothing moves, nothing animates (unrelated DOM changes are free)', async () => {
    const [n, setN] = createSignal(0)
    const r = render(() => (
      <div>
        <span>{n()}</span>
        <div class={n() % 2 ? 'x' : ''} data-h="0" />
        <motion.div layout transition={T} data-k="a" data-testid="a" />
      </div>
    ))
    await settle()
    setN(1)
    await settle()
    expect(translateY(get(r, 'a'))).toBe(0)
    expect(get(r, 'a').style.transform).not.toMatch(/translate3d\([^)]*[1-9]/)
  })

  it('does not measure while idle', async () => {
    const [items] = createSignal(['a', 'b', 'c'])
    render(() => <List items={items} />)
    await settle()
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect')
    await delay(150)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('disconnects its observers when the last layout component is gone', async () => {
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const [items, setItems] = createSignal(['a', 'b'])
    render(() => <List items={items} />)
    await settle()
    expect(resizeTargets.size).toBeGreaterThan(0)
    setItems([])
    await settle()
    await delay(30)
    expect(resizeTargets.size).toBe(0)
    expect(disconnect).toHaveBeenCalled()
    disconnect.mockRestore()
  })

  it('layoutDependency opts a node out of the coordinator', async () => {
    const [items, setItems] = createSignal(['a', 'b'])
    const r = render(() => (
      <div>
        <For each={items()}>
          {k => <motion.div layout layoutDependency="fixed" transition={T} data-k={k} data-testid={k} />}
        </For>
      </div>
    ))
    await settle()
    setItems(['b', 'a'])
    await settle()
    expect(translateY(get(r, 'a'))).toBe(0)
  })

  it('forceRender (createLayoutGroup) animates a change the observers cannot see', async () => {
    let force!: VoidFunction
    const [moved, setMoved] = createSignal(false)
    function Probe() {
      force = createLayoutGroup().forceRender
      return null
    }
    const r = render(() => (
      <LayoutGroup>
        <Probe />
        <div>
          <motion.div layout transition={T} data-k="a" data-testid="a" data-h="100" />
        </div>
      </LayoutGroup>
    ))
    await settle()
    // Moves the element without any DOM mutation the observers watch.
    const el = get(r, 'a')
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const base = rectOf(this)
      const y = base.y + (this === el && moved() ? 150 : 0)
      return { x: 0, y, top: y, left: 0, width: 100, height: 100, right: 100, bottom: y + 100, toJSON() {} } as DOMRect
    })
    setMoved(true)
    flush()
    force()
    await delay(60)
    expect(translateY(el)).toBeLessThan(-100)
    spy.mockRestore()
  })
})
