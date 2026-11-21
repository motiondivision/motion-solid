import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { createInView } from '../use-in-view'
import { createDomRef } from '../use-dom-ref'
import { MockIntersectionObserver, installIntersectionObserver, observersOf, triggerIntersection } from '@/shared/mock-intersection-observer'

beforeEach(() => {
  installIntersectionObserver()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setup(options?: Parameters<typeof createInView>[1]) {
  let isInView!: ReturnType<typeof createInView>
  let element!: () => Element | undefined
  render(() => {
    const [el, ref] = createDomRef()
    element = el
    isInView = createInView(el, options)
    return <div ref={ref} />
  })
  flush()
  return { isInView, element: element() as Element }
}

describe('createInView with a real IntersectionObserver', () => {
  it('tracks entering and leaving', () => {
    const { isInView, element } = setup()
    expect(isInView()).toBe(false)
    triggerIntersection(element, true)
    flush()
    expect(isInView()).toBe(true)
    triggerIntersection(element, false)
    flush()
    expect(isInView()).toBe(false)
  })

  it('uses `initial` until the element is first observed to change', () => {
    const { isInView } = setup({ initial: true })
    expect(isInView()).toBe(true)
  })

  it('passes root, margin and amount to the IntersectionObserver', () => {
    const root = document.createElement('section')
    document.body.append(root)
    const { element } = setup({ root, margin: '20px', amount: 0.5 })
    const [observer] = observersOf(element)
    expect(observer.options).toMatchObject({ root, rootMargin: '20px', threshold: 0.5 })
    root.remove()
  })

  it('resolves root from an accessor and rebuilds the observer when it changes', () => {
    const rootA = document.createElement('div')
    const rootB = document.createElement('div')
    const [root, setRoot] = createSignal<Element>(rootA)
    const { element } = setup(() => ({ root: root() }))
    expect(observersOf(element)[0].options.root).toBe(rootA)
    setRoot(rootB)
    flush()
    const live = observersOf(element)
    expect(live).toHaveLength(1)
    expect(live[0].options.root).toBe(rootB)
    expect(MockIntersectionObserver.instances.filter(o => o.disconnected)).toHaveLength(1)
  })

  it('with once stays true after leaving and stops observing', () => {
    const { isInView, element } = setup({ once: true })
    triggerIntersection(element, true)
    flush()
    expect(isInView()).toBe(true)
    expect(observersOf(element)).toHaveLength(0)
    triggerIntersection(element, false)
    flush()
    expect(isInView()).toBe(true)
  })

  it('without once flips back to false on leaving', () => {
    const { isInView, element } = setup({ once: false })
    triggerIntersection(element, true)
    flush()
    expect(isInView()).toBe(true)
    triggerIntersection(element, false)
    flush()
    expect(isInView()).toBe(false)
    expect(observersOf(element)).toHaveLength(1)
  })

  it('disconnects when its owner is disposed', () => {
    const { unmount } = render(() => {
      const [el, ref] = createDomRef()
      createInView(el)
      return <div ref={ref} />
    })
    flush()
    const [observer] = MockIntersectionObserver.instances
    expect(observer.disconnected).toBe(false)
    unmount()
    expect(observer.disconnected).toBe(true)
  })
})
