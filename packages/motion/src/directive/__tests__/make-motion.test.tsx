import { afterEach, describe, expect, it } from 'vitest'
import { OBSERVE, flush } from 'solid-js'
import { cleanup, fireEvent, render } from '@solidjs/testing-library'
import { MotionConfig } from '@/components/motion-config'
import { domAnimation } from '@/features/dom-animation'
import { makeMotion } from '@/directive'
import { mountedStates } from '@/state'
import { delay } from '@/shared/test'

function externalElement(tag = 'div') {
  const el = document.createElement(tag)
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('makeMotion', () => {
  it('attaches motion to an element you already have, immediately', () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0.5, y: 20 } })
    // No flush or wait: it is the imperative counterpart of makeEventListener.
    expect(el.style.opacity).toBe('0.5')
    expect(el.style.transform).toContain('translateY(20px)')
    expect(mountedStates.has(el)).toBe(true)
    stop()
  })

  it('animates from initial to animate', async () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.05 } })
    expect(el.style.opacity).toBe('0')
    await delay(250)
    expect(Number(el.style.opacity)).toBe(1)
    stop()
  })

  it('runs gestures (whileHover)', async () => {
    const el = externalElement()
    const stop = makeMotion(el, { whileHover: { opacity: 0.25 }, transition: { duration: 0.02 } })
    await fireEvent.pointerEnter(el, { pointerType: 'mouse' })
    await delay(150)
    expect(Number(el.style.opacity)).toBeCloseTo(0.25)
    await fireEvent.pointerLeave(el, { pointerType: 'mouse' })
    await delay(150)
    expect(Number(el.style.opacity)).not.toBeCloseTo(0.25)
    stop()
  })

  it('returns a function that removes motion from the element', () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0.5 } })
    expect(mountedStates.has(el)).toBe(true)
    stop()
    expect(mountedStates.has(el)).toBe(false)
  })

  it('removing twice is harmless', () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0.5 } })
    stop()
    expect(() => stop()).not.toThrow()
  })

  it('is removed automatically with the owner it was called in', async () => {
    const el = externalElement()
    const { unmount } = render(() => {
      makeMotion(el, { initial: { opacity: 0.5 } })
      return <span />
    })
    flush()
    expect(mountedStates.has(el)).toBe(true)

    unmount()
    flush()
    await delay(20)
    expect(mountedStates.has(el)).toBe(false)
  })

  it('works outside any owner', () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0.4 } })
    expect(el.style.opacity).toBe('0.4')
    stop()
  })

  it('honours MotionConfig from the owner it was called in', async () => {
    const el = externalElement()
    let stop!: VoidFunction
    render(() => (
      <MotionConfig transition={{ duration: 0 }}>
        {(() => {
          stop = makeMotion(el, { initial: { opacity: 0 }, animate: { opacity: 0.8 } })
          return <span />
        })()}
      </MotionConfig>
    ))
    flush()
    await delay(100)
    // duration 0 from the config: it has already arrived (the default spring would still be moving)
    expect(Number(el.style.opacity)).toBeCloseTo(0.8)
    stop()
  })

  it('emits no Solid diagnostics when called in a component body under MotionConfig', async () => {
    const cap = OBSERVE!.diagnostics.capture()
    const el = externalElement()
    // A real component body: reading a reactive value there at the top level is what Solid flags.
    function Widget() {
      makeMotion(el, { initial: { opacity: 0 }, animate: { opacity: 0.8 } })
      return <span />
    }
    const { unmount } = render(() => (
      <MotionConfig transition={{ duration: 0 }}>
        <Widget />
      </MotionConfig>
    ))
    flush()
    await delay(50)
    unmount()
    flush()
    await delay(20)
    expect(cap.stop().filter(e => e.severity !== 'info').map(e => `${e.code}: ${e.message}`)).toEqual([])
  })

  it('works on SVG elements (attributes are written, not style)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
    svg.appendChild(gradient)
    document.body.appendChild(svg)
    const stop = makeMotion(gradient as unknown as SVGElement, { initial: { r: 5 } })
    expect(gradient.getAttribute('r')).toBe('5')
    stop()
  })

  it('accepts a feature bundle', () => {
    const el = externalElement()
    const stop = makeMotion(el, { initial: { opacity: 0.3 } }, domAnimation)
    expect(el.style.opacity).toBe('0.3')
    stop()
  })

  it('takes plain options, not an accessor', () => {
    const el = externalElement()
    // @ts-expect-error options are not reactive: use attachMotion with an accessor for that
    const stop = makeMotion(el, () => ({ initial: { opacity: 0.5 } }))
    stop()
  })
})
