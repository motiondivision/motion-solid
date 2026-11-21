import { describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { For, Show, createSignal, flush } from 'solid-js'
import { inView } from 'framer-motion/dom'
import { createInView } from '../use-in-view'
import { createDomRef } from '../use-dom-ref'

vi.mock('framer-motion/dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion/dom')>()
  return { ...actual, inView: vi.fn() }
})

describe('createInView', () => {
  it('resets when the observed element is removed or replaced', () => {
    const enters = new Map<Element, () => (() => void) | undefined>()
    const stops: Array<ReturnType<typeof vi.fn>> = []
    vi.mocked(inView).mockImplementation(((element: Element, onEnter: () => () => void) => {
      enters.set(element, onEnter)
      const stop = vi.fn()
      stops.push(stop)
      return stop
    }) as any)

    const [show, setShow] = createSignal(true)
    const [key, setKey] = createSignal(0)
    const [options, setOptions] = createSignal({})
    let isInView!: ReturnType<typeof createInView>
    let root!: () => Element | undefined
    render(() => {
      const [el, ref] = createDomRef()
      root = el
      isInView = createInView(el, options)
      return (
        <Show when={show()} fallback={<span />}>
          <For each={[key()]}>{() => <div ref={ref} />}</For>
        </Show>
      )
    })
    flush()

    const first = root()!
    expect(first).toBeInstanceOf(HTMLDivElement)
    enters.get(first)!()
    flush()
    expect(isInView()).toBe(true)

    setOptions({})
    flush()
    expect(isInView()).toBe(true)
    expect(inView).toHaveBeenCalledTimes(1)

    setKey(1)
    flush()
    expect(root()).not.toBe(first)
    expect(isInView()).toBe(false)
    expect(stops[0]).toHaveBeenCalled()

    enters.get(root()!)!()
    flush()
    expect(isInView()).toBe(true)
    // A removed element is reported as leaving by IntersectionObserver.
    const leave = enters.get(root()!)!()
    setShow(false)
    flush()
    leave!()
    flush()
    expect(isInView()).toBe(false)
  })

  it('passes once/amount/margin/root and stops observing after entering with once', () => {
    vi.mocked(inView).mockReset()
    let onEnter!: () => unknown
    vi.mocked(inView).mockImplementation(((_el: Element, cb: () => unknown) => {
      onEnter = cb
      return vi.fn()
    }) as any)
    const target = document.createElement('div')
    const rootEl = document.createElement('section')
    let isInView!: ReturnType<typeof createInView>
    render(() => {
      isInView = createInView(() => target, { once: true, amount: 'all', margin: '10px', root: rootEl })
      return <div />
    })
    flush()
    expect(inView).toHaveBeenCalledWith(target, expect.any(Function), { root: rootEl, margin: '10px', amount: 'all' })
    expect(onEnter()).toBeUndefined()
    flush()
    expect(isInView()).toBe(true)
  })

  it('honours initial', () => {
    let isInView!: ReturnType<typeof createInView>
    render(() => {
      isInView = createInView(() => null, { initial: true })
      return <div />
    })
    expect(isInView()).toBe(true)
  })
})
