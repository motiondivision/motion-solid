import { describe, expect, it, vi } from 'vitest'
import { OBSERVE, createSignal, flush, merge } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'motion-dom'
import { motion } from '@/components/motion'
import { MotionConfig } from '@/components/motion-config'
import { mountedStates } from '@/state'
import { delay } from '@/shared/test'

describe('final review regressions (engine)', () => {
  it('forwarding props.ref through a merged props proxy does not read untracked', () => {
    const cap = OBSERVE.diagnostics.capture()
    let got: Element | undefined
    render(() => <motion.div {...merge({ class: 'a' }, { ref: (el: Element) => { got = el } })} />)
    flush()
    const events = cap.stop()
    expect(got).toBeInstanceOf(HTMLDivElement)
    expect(events.filter((e: any) => e.code === 'STRICT_READ_UNTRACKED')).toEqual([])
  })

  it('remounts the motion state when `as` swaps the element', async () => {
    const [t, setT] = createSignal('div')
    const [x, setX] = createSignal(0)
    const r = render(() => <motion.div as={t()} animate={{ opacity: x() }} transition={{ duration: 0.01 }} />)
    flush()
    await delay(50)
    const e1 = r.container.firstElementChild as HTMLElement
    setT('section')
    flush()
    await delay(30)
    const e2 = r.container.firstElementChild as HTMLElement
    expect(e2).not.toBe(e1)
    expect(mountedStates.get(e2)).toBeDefined()
    setX(0.2)
    flush()
    await delay(150)
    expect(e2.style.opacity).toBe('0.2')
  })

  it('whileInView without IntersectionObserver does not throw', async () => {
    const orig = (globalThis as any).IntersectionObserver
    delete (globalThis as any).IntersectionObserver
    try {
      const r = render(() => <motion.div whileInView={{ opacity: 1 }} />)
      flush()
      await delay(30)
      expect(r.container.firstElementChild).toBeTruthy()
    }
    finally {
      if (orig) (globalThis as any).IntersectionObserver = orig
    }
  })

  it('MotionConfig forwards transformPagePoint to the visual element', () => {
    const fn = vi.fn((p: { x: number, y: number }) => p)
    const r = render(() => (
      <MotionConfig transformPagePoint={fn}>
        <motion.div drag />
      </MotionConfig>
    ))
    const el = r.container.firstElementChild as HTMLElement
    expect(mountedStates.get(el)!.visualElement.getTransformPagePoint()).toBe(fn)
  })

  it('swapping a style MotionValue renders the new value', async () => {
    const a = motionValue(1)
    const b = motionValue(0.2)
    const [cur, setCur] = createSignal(a)
    const r = render(() => <motion.div style={{ opacity: cur() }} />)
    flush()
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('1')
    setCur(b)
    flush()
    await delay(50)
    expect(el.style.opacity).toBe('0.2')
  })

  it('transitionEnd for a new key reaches the DOM', async () => {
    const r = render(() => (
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0.5, transitionEnd: { display: 'none' } }} transition={{ duration: 0.05 }} />
    ))
    flush()
    await delay(300)
    expect((r.container.firstElementChild as HTMLElement).style.display).toBe('none')
  })

  it('treats values, _dragX and _dragY as motion props', async () => {
    const { isMotionProp } = await import('@/components/motion/props')
    for (const k of ['values', '_dragX', '_dragY'])
      expect(isMotionProp(k)).toBe(true)
    const r = render(() => <motion.div {...({ values: {}, _dragX: motionValue(0) } as any)} />)
    const el = r.container.firstElementChild!
    expect(el.hasAttribute('values')).toBe(false)
    expect(el.hasAttribute('_dragx')).toBe(false)
  })
})
