import { describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createRoot, flush } from 'solid-js'
import { createAnimationFrame } from '../use-animation-frame'
import { createPageInView } from '../use-page-in-view'
import { createDomRef, getMotionElement } from '../use-dom-ref'
import { createReducedMotion } from '@/animation/hooks/use-reduced-motion'
import { createAnimationControls } from '@/animation/hooks/use-animation-controls'
import { createDragControls } from '@/features/gestures/drag/use-drag-controls'
import { delay } from '@/shared/test'

describe('createAnimationFrame', () => {
  it('ticks until disposed', async () => {
    const cb = vi.fn()
    const { unmount } = render(() => { createAnimationFrame(cb); return <div /> })
    await delay(60)
    expect(cb).toHaveBeenCalled()
    expect(cb.mock.calls[0][0]).toBe(0)
    unmount()
    const n = cb.mock.calls.length
    await delay(60)
    expect(cb.mock.calls.length).toBe(n)
  })
})

describe('createPageInView', () => {
  it('follows document visibility', () => {
    let visible!: () => boolean
    render(() => { visible = createPageInView(); return <div /> })
    expect(visible()).toBe(true)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    flush()
    expect(visible()).toBe(false)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    flush()
    expect(visible()).toBe(true)
  })
})

describe('createReducedMotion', () => {
  it('reflects the media query', () => {
    let listener: ((e: any) => void) | undefined
    const mql = { matches: true, addEventListener: (_: string, l: any) => { listener = l }, removeEventListener: () => {} }
    const original = window.matchMedia
    window.matchMedia = (() => mql) as any
    let reduced!: () => boolean
    render(() => { reduced = createReducedMotion(); return <div /> })
    flush()
    expect(reduced()).toBe(true)
    mql.matches = false
    listener?.({ matches: false })
    flush()
    expect(reduced()).toBe(false)
    window.matchMedia = original
  })
})

describe('createDomRef', () => {
  it('exposes the ref element reactively', () => {
    let el!: () => Element | undefined
    render(() => {
      const [e, ref] = createDomRef()
      el = e
      return <p ref={ref} />
    })
    flush()
    expect(el()?.tagName).toBe('P')
  })
  it('skips text and comment nodes', () => {
    const text = document.createTextNode('x')
    const div = document.createElement('div')
    const parent = document.createElement('div')
    parent.append(text, div)
    expect(getMotionElement(text)).toBe(div)
  })
})

describe('createAnimationControls', () => {
  it('only allows start after mount and stops on cleanup', () => {
    let controls!: ReturnType<typeof createAnimationControls>
    const { unmount } = render(() => { controls = createAnimationControls(); return <div /> })
    flush()
    expect(() => controls.start({ x: 1 })).not.toThrow()
    unmount()
    expect(() => controls.start({ x: 1 })).toThrow(/after a component has mounted/)
  })
  it('throws before mount', () => {
    const controls = createRoot(() => createAnimationControls())
    expect(() => controls.set({ x: 1 })).toThrow()
  })
})

describe('createDragControls', () => {
  it('forwards start/stop/cancel to subscribed controls', () => {
    const dc = createDragControls()
    const sub = { start: vi.fn(), stop: vi.fn(), cancel: vi.fn() }
    const off = dc.subscribe(sub as any)
    const ev = new Event('pointerdown') as any
    dc.start(ev, { snapToCursor: true }); dc.stop(); dc.cancel()
    expect(sub.start).toHaveBeenCalledWith(ev, { snapToCursor: true })
    expect(sub.stop).toHaveBeenCalled(); expect(sub.cancel).toHaveBeenCalled()
    off(); dc.stop()
    expect(sub.stop).toHaveBeenCalledTimes(1)
  })
})
