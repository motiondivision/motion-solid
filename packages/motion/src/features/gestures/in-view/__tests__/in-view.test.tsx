import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { Show, createSignal, flush } from 'solid-js'
import { Motion } from '@/components/motion'
import { MotionConfig } from '@/components/motion-config'
import { delay } from '@/shared/test'
import { MockIntersectionObserver, installIntersectionObserver, observersOf, triggerIntersection } from '@/shared/mock-intersection-observer'

beforeEach(() => {
  installIntersectionObserver()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('whileInView', () => {
  it('applies the variant on entering the viewport and reverts on leaving', async () => {
    const { getByTestId } = render(() => (
      <Motion data-testid="el" whileInView={{ opacity: 0.4 }} transition={{ duration: 0 }} />
    ))
    flush()
    const el = getByTestId('el')
    expect(observersOf(el)).toHaveLength(1)

    triggerIntersection(el, true)
    await delay(50)
    expect(el.style.opacity).toBe('0.4')

    triggerIntersection(el, false)
    await delay(50)
    expect(el.style.opacity).not.toBe('0.4')
  })

  it('does not observe an element with no viewport props', () => {
    const { getByTestId } = render(() => <Motion data-testid="el" animate={{ opacity: 1 }} />)
    flush()
    expect(observersOf(getByTestId('el'))).toHaveLength(0)
  })

  it('stays applied after leaving with inViewOptions.once, and stops observing', async () => {
    const { getByTestId } = render(() => (
      <Motion
        data-testid="el"
        whileInView={{ opacity: 0.4 }}
        inViewOptions={{ once: true }}
        transition={{ duration: 0 }}
      />
    ))
    flush()
    const el = getByTestId('el')
    triggerIntersection(el, true)
    await delay(50)
    expect(el.style.opacity).toBe('0.4')
    // `once` unobserves the element after its first entry.
    expect(observersOf(el)).toHaveLength(0)
    triggerIntersection(el, false)
    await delay(50)
    expect(el.style.opacity).toBe('0.4')
  })

  it('maps amount, margin and root onto IntersectionObserver options', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const { getByTestId } = render(() => (
      <Motion
        data-testid="el"
        whileInView={{ opacity: 0.4 }}
        inViewOptions={{ amount: 'all', margin: '10px', root }}
      />
    ))
    flush()
    const [observer] = observersOf(getByTestId('el'))
    expect(observer.options).toMatchObject({ threshold: 1, rootMargin: '10px', root })
    root.remove()
  })

  it('reads inViewOptions from MotionConfig', () => {
    const { getByTestId } = render(() => (
      <MotionConfig inViewOptions={{ amount: 0.25 }}>
        <Motion data-testid="el" whileInView={{ opacity: 0.4 }} />
      </MotionConfig>
    ))
    flush()
    const [observer] = observersOf(getByTestId('el'))
    expect(observer.options.threshold).toBe(0.25)
  })

  it('re-creates the observer when the amount changes', () => {
    const [amount, setAmount] = createSignal<'some' | 'all'>('some')
    const { getByTestId } = render(() => (
      <Motion data-testid="el" whileInView={{ opacity: 0.4 }} inViewOptions={{ amount: amount() }} />
    ))
    flush()
    const el = getByTestId('el')
    expect(observersOf(el)[0].options.threshold).toBe(0)
    setAmount('all')
    flush()
    const live = observersOf(el)
    expect(live).toHaveLength(1)
    expect(live[0].options.threshold).toBe(1)
  })

  it('disconnects the observer when the component is removed', async () => {
    const [show, setShow] = createSignal(true)
    render(() => <Show when={show()}><Motion data-testid="el" whileInView={{ opacity: 0.4 }} /></Show>)
    flush()
    const [observer] = MockIntersectionObserver.instances
    expect(observer.disconnected).toBe(false)
    setShow(false)
    flush()
    await delay(20)
    expect(observer.disconnected).toBe(true)
  })
})

describe('onViewportEnter / onViewportLeave', () => {
  it('call back with the intersection entry', async () => {
    const onViewportEnter = vi.fn()
    const onViewportLeave = vi.fn()
    const { getByTestId } = render(() => (
      <Motion data-testid="el" onViewportEnter={onViewportEnter} onViewportLeave={onViewportLeave} />
    ))
    flush()
    const el = getByTestId('el')

    triggerIntersection(el, true)
    await delay(50)
    expect(onViewportEnter).toHaveBeenCalledTimes(1)
    expect(onViewportEnter.mock.calls[0][0]).toMatchObject({ target: el, isIntersecting: true })
    expect(onViewportLeave).not.toHaveBeenCalled()

    triggerIntersection(el, false)
    await delay(50)
    expect(onViewportLeave).toHaveBeenCalledTimes(1)
    expect(onViewportLeave.mock.calls[0][0]).toMatchObject({ target: el, isIntersecting: false })

    triggerIntersection(el, true)
    await delay(50)
    expect(onViewportEnter).toHaveBeenCalledTimes(2)
  })

  it('with once only fire onViewportEnter, once', async () => {
    const onViewportEnter = vi.fn()
    const onViewportLeave = vi.fn()
    const { getByTestId } = render(() => (
      <Motion
        data-testid="el"
        inViewOptions={{ once: true }}
        onViewportEnter={onViewportEnter}
        onViewportLeave={onViewportLeave}
      />
    ))
    flush()
    const el = getByTestId('el')
    triggerIntersection(el, true)
    await delay(50)
    triggerIntersection(el, false)
    triggerIntersection(el, true)
    await delay(50)
    expect(onViewportEnter).toHaveBeenCalledTimes(1)
    expect(onViewportLeave).not.toHaveBeenCalled()
  })
})
