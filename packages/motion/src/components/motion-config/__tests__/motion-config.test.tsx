import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'framer-motion/dom'
import { MotionConfig, useMotionConfig } from '@/components/motion-config'
import { Motion } from '@/components/motion'

describe('reducedMotion', () => {
  it('reducedMotion always', async () => {
    const scale = motionValue(1)
    render(() => (
      <MotionConfig reducedMotion="always">
        <Motion animate={{ scale: 0.5 }} style={{ scale }} />
      </MotionConfig>
    ))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(scale.get()).toBe(0.5)
  })
})

describe('skipAnimations', () => {
  it('applies animate values instantly and completes the animation', async () => {
    const x = motionValue(0)
    const opacity = motionValue(0)
    const onAnimationComplete = vi.fn()
    render(() => (
      <MotionConfig skipAnimations>
        <Motion
          animate={{ x: 100, opacity: 1 }}
          transition={{ duration: 10 }}
          style={{ x, opacity }}
          onAnimationComplete={onAnimationComplete}
        />
      </MotionConfig>
    ))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(x.get()).toBe(100)
    expect(opacity.get()).toBe(1)
    expect(onAnimationComplete).toHaveBeenCalledTimes(1)
  })

  it('starts an element at its animate values, and still completes its animation', async () => {
    const onAnimationComplete = vi.fn()
    const { container } = render(() => (
      <MotionConfig skipAnimations>
        <Motion
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 10 }}
          onAnimationComplete={onAnimationComplete}
        />
      </MotionConfig>
    ))
    // As mounted, before a frame has applied the skipped animation's values
    const { style } = container.querySelector('div') as HTMLElement
    expect(style.opacity).toBe('1')
    expect(style.transform).toBe('none')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(onAnimationComplete).toHaveBeenCalledTimes(1)
  })

  it('starts a variant child at the variant its parent animates to', () => {
    const variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    const { container } = render(() => (
      <MotionConfig skipAnimations>
        <Motion initial="hidden" animate="visible" variants={variants}>
          <Motion data-testid="child" variants={variants} />
        </Motion>
      </MotionConfig>
    ))
    const { style } = container.querySelector('[data-testid="child"]') as HTMLElement
    expect(style.opacity).toBe('1')
  })

  it('is inherited through a nested MotionConfig that does not set it', async () => {
    const x = motionValue(0)
    render(() => (
      <MotionConfig skipAnimations>
        <MotionConfig transition={{ duration: 10 }}>
          <Motion animate={{ x: 100 }} style={{ x }} />
        </MotionConfig>
      </MotionConfig>
    ))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(x.get()).toBe(100)
  })
})

describe('MotionConfig context', () => {
  it('inherits unset values from the parent and overrides set ones', () => {
    let inner!: () => ReturnType<ReturnType<typeof useMotionConfig>>
    function Probe() {
      inner = useMotionConfig()
      return null
    }
    render(() => (
      <MotionConfig reducedMotion="always" nonce="abc" transition={{ duration: 1 }}>
        <MotionConfig transition={{ duration: 2 }}>
          <Probe />
        </MotionConfig>
      </MotionConfig>
    ))
    expect(inner().reducedMotion).toBe('always')
    expect(inner().nonce).toBe('abc')
    expect((inner().transition as any).duration).toBe(2)
  })

  it('follows prop changes', () => {
    let current!: ReturnType<typeof useMotionConfig>
    function Probe() {
      current = useMotionConfig()
      return null
    }
    const [reduced, setReduced] = createSignal<'user' | 'never'>('never')
    render(() => (
      <MotionConfig reducedMotion={reduced()}>
        <Probe />
      </MotionConfig>
    ))
    expect(current().reducedMotion).toBe('never')
    setReduced('user')
    flush()
    expect(current().reducedMotion).toBe('user')
  })

  it('maps the deprecated reduceMotion prop onto reducedMotion', () => {
    let current!: ReturnType<typeof useMotionConfig>
    function Probe() {
      current = useMotionConfig()
      return null
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const [nonce, setNonce] = createSignal('a')
    render(() => (
      <MotionConfig reduceMotion="always" nonce={nonce()}>
        <Probe />
      </MotionConfig>
    ))
    flush()
    expect(current().reducedMotion).toBe('always')
    // The deprecation warning is emitted once, not on every config recompute.
    setNonce('b')
    flush()
    expect(current().nonce).toBe('b')
    const deprecations = warn.mock.calls.filter(([message]) => String(message).includes('reduceMotion'))
    expect(deprecations).toHaveLength(1)
    warn.mockRestore()
  })

  it('provides the default config outside a MotionConfig', () => {
    let current!: ReturnType<typeof useMotionConfig>
    function Probe() {
      current = useMotionConfig()
      return null
    }
    render(() => <Probe />)
    expect(current().reducedMotion).toBe('never')
  })

  it('applies the config transition to motion components', async () => {
    const x = motionValue(0)
    render(() => (
      <MotionConfig transition={{ type: false }}>
        <Motion animate={{ x: 40 }} style={{ x }} />
      </MotionConfig>
    ))
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(x.get()).toBe(40)
  })
})
