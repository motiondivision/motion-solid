import { describe, expect, it } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createComputedMotionValue } from '../use-computed'
import { createCombineMotionValues } from '../use-combine-values'
import { delay } from '@/shared/test'

describe('createComputedMotionValue', () => {
  it('computes the initial value synchronously', () => {
    const x = motionValue(2)
    createRoot((dispose) => {
      expect(createComputedMotionValue(() => x.get() * 3).get()).toBe(6)
      dispose()
    })
  })

  it('recomputes when a collected MotionValue changes, once per frame', async () => {
    const a = motionValue(1)
    const b = motionValue(2)
    let runs = 0
    const { sum, dispose } = createRoot(dispose => ({
      sum: createComputedMotionValue(() => {
        runs++
        return a.get() + b.get()
      }),
      dispose,
    }))
    expect(sum.get()).toBe(3)
    const initialRuns = runs
    a.set(10)
    b.set(20)
    await delay(50)
    expect(sum.get()).toBe(30)
    expect(runs - initialRuns).toBe(1)
    dispose()
  })

  it('recomputes when a Solid signal changes and resubscribes to new MotionValues', async () => {
    const a = motionValue(1)
    const b = motionValue(100)
    const [useB, setUseB] = createSignal(false)
    const { value, dispose } = createRoot((dispose) => ({
      value: createComputedMotionValue(() => (useB() ? b.get() : a.get())),
      dispose,
    }))
    expect(value.get()).toBe(1)

    setUseB(true)
    flush()
    expect(value.get()).toBe(100)

    b.set(200)
    await delay(50)
    expect(value.get()).toBe(200)

    // a is no longer a dependency
    a.set(5)
    await delay(50)
    expect(value.get()).toBe(200)
    dispose()
  })

  it('stops updating after the owner is disposed', async () => {
    const x = motionValue(1)
    const { value, dispose } = createRoot(dispose => ({ value: createComputedMotionValue(() => x.get()), dispose }))
    dispose()
    x.set(9)
    await delay(50)
    expect(value.get()).toBe(1)
  })
})

describe('createCombineMotionValues', () => {
  it('uses explicit sources when provided', async () => {
    const a = motionValue(1)
    const b = motionValue(2)
    const { value, dispose } = createRoot(dispose => ({
      value: createCombineMotionValues(() => a.get() + b.get(), [a, b]),
      dispose,
    }))
    expect(value.get()).toBe(3)
    b.set(5)
    await delay(50)
    expect(value.get()).toBe(6)
    dispose()
  })

  it('accepts an accessor of sources', async () => {
    const a = motionValue(1)
    const b = motionValue(10)
    const [source, setSource] = createSignal(a)
    const { value, dispose } = createRoot(dispose => ({
      value: createCombineMotionValues(() => source().get(), () => [source()]),
      dispose,
    }))
    expect(value.get()).toBe(1)
    setSource(b)
    flush()
    expect(value.get()).toBe(10)
    b.set(11)
    await delay(50)
    expect(value.get()).toBe(11)
    dispose()
  })
})
