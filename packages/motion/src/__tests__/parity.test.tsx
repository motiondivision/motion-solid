import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createRoot, flush } from 'solid-js'
import { MotionGlobalConfig } from 'motion-utils'
import { frame, rootProjectionNode } from 'motion-dom'
import {
  DragControls,
  MotionConfig,
  ScrollOffset,
  WillChangeMotionValue,
  animationControls,
  correctParentTransform,
  createAnimationControls,
  createDragControls,
  createInstantLayoutTransition,
  createInstantTransition,
  createReducedMotionConfig,
  createResetProjection,
  createWillChange,
  disableInstantTransitions,
  domAnimation,
  domMax,
  domMin,
  isMotionComponent,
  isValidMotionProp,
  m,
  motion,
  transformViewBoxPoint,
  unwrapMotionComponent,
} from '@/index'
import { delay } from '@/shared/test'

afterEach(() => {
  MotionGlobalConfig.instantAnimations = false
  vi.unstubAllGlobals()
})

describe('createWillChange', () => {
  it('starts as auto and becomes transform for transform and accelerated values', () => {
    const willChange = createWillChange()
    expect(willChange).toBeInstanceOf(WillChangeMotionValue)
    expect(willChange.get()).toBe('auto')
    willChange.add('color')
    expect(willChange.get()).toBe('auto')
    willChange.add('x')
    expect(willChange.get()).toBe('transform')
  })

  it('is fed by a motion component that animates a transform', async () => {
    const willChange = createWillChange()
    render(() => <motion.div style={{ willChange }} animate={{ x: 10 }} transition={{ duration: 0 }} />)
    flush()
    await delay(50)
    expect(willChange.get()).toBe('transform')
  })
})

describe('createReducedMotionConfig', () => {
  function stubPreference(matches: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }))
  }

  function read(config?: 'user' | 'never' | 'always') {
    let reduced!: () => boolean
    function Probe() {
      reduced = createReducedMotionConfig()
      return null
    }
    render(() => (config ? <MotionConfig reducedMotion={config}><Probe /></MotionConfig> : <Probe />))
    flush()
    return reduced()
  }

  it('is false by default and with "never", whatever the user prefers', () => {
    stubPreference(true)
    expect(read()).toBe(false)
    expect(read('never')).toBe(false)
  })

  it('is true with "always"', () => {
    stubPreference(false)
    expect(read('always')).toBe(true)
  })

  it('follows the user preference with "user"', () => {
    stubPreference(true)
    expect(read('user')).toBe(true)
    stubPreference(false)
    expect(read('user')).toBe(false)
  })
})

describe('instant transitions', () => {
  it('createInstantTransition runs the callback with instant animations on, and off two frames later', async () => {
    const instant = createRoot(() => createInstantTransition())
    let during: boolean | undefined
    instant(() => { during = MotionGlobalConfig.instantAnimations })
    expect(during).toBe(true)
    expect(MotionGlobalConfig.instantAnimations).toBe(true)
    await delay(100)
    expect(MotionGlobalConfig.instantAnimations).toBe(false)
  })

  it('a later call keeps animations instant until its own two frames have passed', async () => {
    const instant = createRoot(() => createInstantTransition())
    instant(() => {})
    await new Promise<void>(resolve => frame.postRender(() => resolve()))
    instant(() => {})
    // The first call's own unblock runs by the next frame, and must not turn animations off.
    await new Promise<void>(resolve => frame.postRender(() => resolve()))
    expect(MotionGlobalConfig.instantAnimations).toBe(true)
    await delay(100)
    expect(MotionGlobalConfig.instantAnimations).toBe(false)
  })

  it('disableInstantTransitions turns instant animations off', () => {
    MotionGlobalConfig.instantAnimations = true
    disableInstantTransitions()
    expect(MotionGlobalConfig.instantAnimations).toBe(false)
  })

  it('createInstantLayoutTransition runs its callback, with or without a layout tree', () => {
    const start = createInstantLayoutTransition()
    const callback = vi.fn()
    start(callback)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

describe('createResetProjection', () => {
  it('resets the root projection tree, and is safe without one', () => {
    const reset = createResetProjection()
    const previous = rootProjectionNode.current
    rootProjectionNode.current = undefined
    expect(() => reset()).not.toThrow()
    const resetTree = vi.fn()
    rootProjectionNode.current = { resetTree } as any
    reset()
    expect(resetTree).toHaveBeenCalledTimes(1)
    rootProjectionNode.current = previous
  })
})

describe('animation controls', () => {
  it('animationControls() works with no owner once mounted by hand', () => {
    const controls = animationControls()
    expect(() => controls.start({ opacity: 1 })).toThrow(/after a component has mounted/)
    const unmount = controls.mount()
    expect(() => controls.set({ opacity: 1 })).not.toThrow()
    unmount()
    expect(() => controls.set({ opacity: 1 })).toThrow()
  })

  it('createAnimationControls mounts the controls once settled', () => {
    let controls!: ReturnType<typeof createAnimationControls>
    render(() => {
      controls = createAnimationControls()
      return <motion.div animate={controls} />
    })
    flush()
    expect(() => controls.set({ opacity: 1 })).not.toThrow()
  })
})

describe('drag controls', () => {
  it('createDragControls returns a DragControls', () => {
    expect(createDragControls()).toBeInstanceOf(DragControls)
  })
})

describe('feature bundles', () => {
  it('domMin is animation and exit only; domAnimation adds gestures; domMax adds layout and drag', () => {
    const keys = (bundle: typeof domMin) => bundle.features.map(feature => (feature as any).key)
    expect(keys(domMin)).toEqual(['animation', 'exit'])
    expect(keys(domAnimation)).toEqual(expect.arrayContaining(['animation', 'exit', 'hover', 'press', 'focus', 'inView']))
    expect(keys(domAnimation)).not.toContain('drag')
    expect(keys(domMax)).toEqual(expect.arrayContaining(['drag', 'pan', 'layout', 'projection']))
    expect(domMin.renderer).toBe(domAnimation.renderer)
  })
})

describe('motion component helpers', () => {
  it('isMotionComponent / unwrapMotionComponent identify motion components', () => {
    function Plain() {
      return <div />
    }
    const Wrapped = motion.create(Plain)
    expect(isMotionComponent(motion.div)).toBe(true)
    expect(isMotionComponent(m.span)).toBe(true)
    expect(isMotionComponent(Wrapped)).toBe(true)
    expect(isMotionComponent(Plain)).toBe(false)
    expect(isMotionComponent('div')).toBe(false)
    expect(isMotionComponent(null)).toBe(false)
    expect(unwrapMotionComponent(motion.div)).toBe('div')
    expect(unwrapMotionComponent(Wrapped)).toBe(Plain)
    expect(unwrapMotionComponent(Plain)).toBeUndefined()
  })

  it('isValidMotionProp tells motion props from element props', () => {
    for (const prop of ['animate', 'exit', 'whileHover', 'whileInView', 'dragConstraints', 'layoutId', 'onTap', 'onPanStart', 'onLayoutMeasure', 'transition'])
      expect(isValidMotionProp(prop)).toBe(true)
    for (const prop of ['draggable', 'class', 'onClick', 'id', 'aria-label'])
      expect(isValidMotionProp(prop)).toBe(false)
  })
})

describe('transformPagePoint helpers', () => {
  function rect(el: Element, r: { left: number, top: number, width: number, height: number }) {
    el.getBoundingClientRect = () => ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON() {} }) as DOMRect
  }

  it('transformViewBoxPoint scales pointer coordinates into viewBox space', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    Object.defineProperty(svg, 'viewBox', { value: { baseVal: { width: 100, height: 100 } } })
    rect(svg, { left: 10, top: 20, width: 500, height: 500 })
    const transform = transformViewBoxPoint(() => svg)
    expect(transform({ x: 10 + 250, y: 20 + 250 })).toEqual({ x: 10 + 50, y: 20 + 50 })
    expect(transformViewBoxPoint(() => undefined)({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 })
    expect(transformViewBoxPoint({ current: svg })({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
  })

  it('correctParentTransform undoes a parent rotation around its centre', () => {
    const parent = document.createElement('div')
    document.body.append(parent)
    rect(parent, { left: 0, top: 0, width: 100, height: 100 })
    // rotate(90deg)
    parent.style.transform = 'matrix(0, 1, -1, 0, 0, 0)'
    const transform = correctParentTransform(() => parent)
    const result = transform({ x: 100, y: 50 })
    expect(result.x).toBeCloseTo(50)
    expect(result.y).toBeCloseTo(0)
    parent.style.transform = 'none'
    expect(transform({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 })
    parent.remove()
  })
})

describe('ScrollOffset', () => {
  it('is exported with its presets', () => {
    expect(ScrollOffset.Enter).toBeDefined()
  })
})
