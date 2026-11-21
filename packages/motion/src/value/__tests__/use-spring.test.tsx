import { describe, expect, it, vi } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createFollowValue, createSpring } from '../use-spring'
import { delay } from '@/shared/test'

describe('createSpring', () => {
  it('fires animationComplete on the returned motionValue when source changes', async () => {
    const onComplete = vi.fn()
    const source = motionValue(0)
    const dispose = createRoot((dispose) => {
      const springValue = createSpring(source, {
        stiffness: 500,
        damping: 20,
        restDelta: 0.001,
        restSpeed: 0.01,
      })
      springValue.on('animationComplete', onComplete)
      source.set(100)
      return dispose
    })

    await delay(3000)
    expect(onComplete).toHaveBeenCalled()
    dispose()
  })

  it('initialises from a plain value or a MotionValue', () => {
    createRoot((dispose) => {
      expect(createSpring(5).get()).toBe(5)
      expect(createSpring(motionValue(7)).get()).toBe(7)
      dispose()
    })
  })

  it('springs towards the source and ends at its value', async () => {
    const source = motionValue(0)
    const { spring, dispose } = createRoot(dispose => ({ spring: createSpring(source, { stiffness: 1000, damping: 50 }), dispose }))
    source.set(100)
    await delay(60)
    const mid = spring.get()
    expect(mid).toBeGreaterThan(0)
    await delay(1500)
    expect(spring.get()).toBeCloseTo(100, 0)
    dispose()
  })

  it('follows an accessor source', async () => {
    const [target, setTarget] = createSignal(0)
    const { spring, dispose } = createRoot(dispose => ({
      spring: createSpring(target, { stiffness: 1000, damping: 50 }),
      dispose,
    }))
    expect(spring.get()).toBe(0)
    setTarget(50)
    flush()
    await delay(1500)
    expect(spring.get()).toBeCloseTo(50, 0)
    dispose()
  })

  it('stops following after the owner is disposed', async () => {
    const source = motionValue(0)
    const { spring, dispose } = createRoot(dispose => ({ spring: createSpring(source), dispose }))
    dispose()
    source.set(100)
    await delay(100)
    expect(spring.get()).toBe(0)
  })
})

describe('createFollowValue', () => {
  it('follows a source with a tween', async () => {
    const source = motionValue(0)
    const { value, dispose } = createRoot(dispose => ({
      value: createFollowValue(source, { type: 'tween', duration: 0.1, ease: 'linear' }),
      dispose,
    }))
    source.set(100)
    await delay(600)
    expect(value.get()).toBeCloseTo(100, 0)
    dispose()
  })
})
