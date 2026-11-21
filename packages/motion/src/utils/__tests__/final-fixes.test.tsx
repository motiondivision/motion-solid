import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { OBSERVE, createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { LayoutGroup, createComputedMotionValue, createDomRef, createInView, createScroll, motion } from '@/index'
import type { HTMLMotionProps, ScrollMotionValues, SVGMotionProps, UseInViewOptions, MotionTagComponent } from '@/index'

import { installIntersectionObserver } from '@/shared/mock-intersection-observer'

beforeEach(() => { installIntersectionObserver() })
afterEach(() => { vi.unstubAllGlobals() })

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const capture = () => OBSERVE!.diagnostics.capture()
const codes = (cap: ReturnType<typeof capture>) => cap.stop().map(e => e.code as string)

describe('final fixes (hooks)', () => {
  it('type aliases exist', () => {
    const a: HTMLMotionProps<'div'> | SVGMotionProps<'svg'> | UseInViewOptions | ScrollMotionValues | MotionTagComponent | undefined = undefined
    expect(a).toBeUndefined()
  })

  it('combine values re-collects conditional MotionValue dependencies', async () => {
    const flag = motionValue(true)
    const a = motionValue(1)
    const b = motionValue(100)
    let c: any
    createRoot(() => { c = createComputedMotionValue(() => (flag.get() ? a.get() : b.get())) })
    flush()
    expect(c.get()).toBe(1)
    flag.set(false)
    await delay(60)
    expect(c.get()).toBe(100)
    b.set(200)
    await delay(60)
    expect(c.get()).toBe(200)
  })

  it('createScroll with a signal-backed ref and createInView once emit no strict-read diagnostics', async () => {
    const cap = capture()
    function C() {
      const [target, ref] = createDomRef<HTMLDivElement>()
      const { scrollYProgress } = createScroll({ target })
      createInView(target, { once: true })
      return <div ref={ref}><motion.div style={{ opacity: scrollYProgress }} /></div>
    }
    const r = render(() => <C />)
    flush()
    await delay(30)
    flush()
    r.unmount()
    flush()
    const found = codes(cap)
    expect(found.filter((c: string) => c === 'STRICT_READ_UNTRACKED')).toEqual([])
  })

  it('layout motion components in a LayoutGroup emit no strict-read diagnostics on update', async () => {
    const [a, setA] = createSignal(0)
    render(() => <LayoutGroup id="g"><motion.div layout layoutId="x" animate={{ x: a() }} /></LayoutGroup>)
    flush()
    const cap = capture()
    setA(5)
    flush()
    await delay(20)
    flush()
    const found = codes(cap)
    expect(found.filter((c: string) => c === 'STRICT_READ_UNTRACKED')).toEqual([])
  })

  it('createInView with reactive options emits no diagnostics', async () => {
    const cap = capture()
    const [once] = createSignal(true)
    function C() {
      const [el, ref] = createDomRef<HTMLDivElement>()
      createInView(el, () => ({ once: once(), initial: once() }))
      return <div ref={ref} />
    }
    render(() => <C />)
    flush()
    await delay(10)
    flush()
    expect(codes(cap).filter(c => c === 'STRICT_READ_UNTRACKED')).toEqual([])
  })
})
