import { describe, expect, it } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createTransform } from '../use-transform'
import { delay } from '@/shared/test'

function inRoot<T>(fn: () => T) {
  let dispose!: () => void
  const result = createRoot((d) => {
    dispose = d
    return fn()
  })
  return { result, dispose }
}

const makeAccelerate = (overrides: Record<string, unknown> = {}) => ({
  factory: () => ({ stop: () => {} }) as any,
  times: [0, 1],
  keyframes: [0, 1],
  ease: (v: number) => v,
  duration: 1,
  ...overrides,
})

describe('createTransform', () => {
  it('updates when a Solid signal read by a function changes', async () => {
    const [x, setX] = createSignal(0)
    const { result: transformed, dispose } = inRoot(() => createTransform(() => x()))
    expect(transformed.get()).toBe(0)

    setX(100)
    flush()
    expect(transformed.get()).toBe(100)
    dispose()
  })

  it('updates when a MotionValue read by a function changes', async () => {
    const x = motionValue(1)
    const { result: doubled, dispose } = inRoot(() => createTransform(() => x.get() * 2))
    expect(doubled.get()).toBe(2)

    x.set(5)
    await delay(50)
    expect(doubled.get()).toBe(10)
    dispose()
  })

  it('maps a range', async () => {
    const x = motionValue(50)
    const { result: opacity, dispose } = inRoot(() => createTransform(x, [0, 100], [0, 1]))
    expect(opacity.get()).toBe(0.5)

    x.set(100)
    await delay(50)
    expect(opacity.get()).toBe(1)
    dispose()
  })

  it('passes the latest value through a transformer function', async () => {
    const x = motionValue(10)
    const { result: y, dispose } = inRoot(() => createTransform(x, v => v * 2))
    expect(y.get()).toBe(20)
    x.set(11)
    await delay(50)
    expect(y.get()).toBe(22)
    dispose()
  })

  it('combines an array of MotionValues', async () => {
    const x = motionValue(2)
    const y = motionValue(3)
    const { result: z, dispose } = inRoot(() => createTransform([x, y], ([a, b]) => (a as number) * (b as number)))
    expect(z.get()).toBe(6)
    y.set(4)
    await delay(50)
    expect(z.get()).toBe(8)
    dispose()
  })

  it('supports an accessor inputRange (single output)', async () => {
    const x = motionValue(50)
    const [inputRange, setInputRange] = createSignal([0, 100])
    const { result: opacity, dispose } = inRoot(() => createTransform(x, inputRange, [0, 1]))
    expect(opacity.get()).toBe(0.5)

    setInputRange([0, 50])
    flush()
    expect(opacity.get()).toBe(1)
    dispose()
  })

  it('supports an accessor outputRange', () => {
    const x = motionValue(50)
    const [outputRange, setOutputRange] = createSignal([0, 10])
    const { result, dispose } = inRoot(() => createTransform(x, [0, 100], outputRange))
    expect(result.get()).toBe(5)
    setOutputRange([0, 20])
    flush()
    expect(result.get()).toBe(10)
    dispose()
  })

  it('stops following the source after the owner is disposed', async () => {
    const x = motionValue(0)
    const { result, dispose } = inRoot(() => createTransform(x, [0, 100], [0, 1]))
    dispose()
    x.set(100)
    await delay(50)
    expect(result.get()).toBe(0)
  })

  describe('accelerate propagation', () => {
    it('propagates accelerate config from input to output for range transform', () => {
      const x = motionValue(0)
      const accelerate = makeAccelerate()
      x.accelerate = accelerate

      const { result: opacity, dispose } = inRoot(() => createTransform(x, [0, 1], [0, 1]))

      expect(opacity.accelerate).toBeDefined()
      expect(opacity.accelerate!.times).toEqual([0, 0, 1, 1])
      expect(opacity.accelerate!.keyframes).toEqual([0, 0, 1, 1])
      expect(opacity.accelerate!.isTransformed).toBe(true)
      expect(opacity.accelerate!.factory).toBe(accelerate.factory)
      dispose()
    })

    it('does not propagate when the transformer is a function', () => {
      const x = motionValue(0)
      x.accelerate = makeAccelerate()
      const { result, dispose } = inRoot(() => createTransform(x, v => v * 2))
      expect(result.accelerate).toBeUndefined()
      dispose()
    })

    it('does not propagate when clamp is false', () => {
      const x = motionValue(0)
      x.accelerate = makeAccelerate()
      const { result, dispose } = inRoot(() => createTransform(x, [0, 1], [0, 1], { clamp: false }))
      expect(result.accelerate).toBeUndefined()
      dispose()
    })

    it('does not propagate when a mixer is provided', () => {
      const x = motionValue(0)
      x.accelerate = makeAccelerate()
      const { result, dispose } = inRoot(() =>
        createTransform(x, [0, 1], ['blur(0px)', 'blur(10px)'], { mixer: () => () => 'blur(5px)' }),
      )
      expect(result.accelerate).toBeUndefined()
      dispose()
    })

    it('does not propagate when already transformed', () => {
      const x = motionValue(0)
      x.accelerate = makeAccelerate({ isTransformed: true })
      const { result, dispose } = inRoot(() => createTransform(x, [0, 1], [0, 1]))
      expect(result.accelerate).toBeUndefined()
      dispose()
    })

    it('uses the resolved inputRange when it is an accessor, and follows it', () => {
      const x = motionValue(0)
      x.accelerate = makeAccelerate()
      const [inputRange, setInputRange] = createSignal([0, 100])
      const { result: opacity, dispose } = inRoot(() => createTransform(x, inputRange, [0, 1]))

      expect(opacity.accelerate!.times).toEqual([0, 0, 100, 1])
      expect(opacity.accelerate!.keyframes).toEqual([0, 0, 1, 1])

      setInputRange([0, 50])
      flush()
      expect(opacity.accelerate!.times).toEqual([0, 0, 50, 1])
      dispose()
    })

    it('pads an ease array to match the endpoint times', () => {
      const easeFn = (v: number) => v
      const x = motionValue(0)
      x.accelerate = makeAccelerate({ ease: easeFn })
      const { result: opacity, dispose } = inRoot(() => createTransform(x, [0, 1], [0, 1], { ease: [easeFn] }))
      expect(opacity.accelerate!.ease).toEqual([easeFn, easeFn])
      dispose()
    })
  })

  describe('multi-output transform', () => {
    it('transforms a single input to multiple outputs', () => {
      const x = motionValue(0)
      const { result, dispose } = inRoot(() => createTransform(x, [0, 100], {
        opacity: [0, 1],
        scale: [0.5, 1],
      }))

      expect(result).toHaveProperty('opacity')
      expect(result).toHaveProperty('scale')
      expect(result.opacity.get()).toBe(0)
      expect(result.scale.get()).toBe(0.5)
      dispose()
    })

    it('updates multiple outputs when the input changes', async () => {
      const x = motionValue(0)
      const { result, dispose } = inRoot(() => createTransform(x, [0, 100], {
        opacity: [0, 1],
        scale: [0.5, 1],
      }))

      x.set(50)
      await delay(50)
      expect(result.opacity.get()).toBe(0.5)
      expect(result.scale.get()).toBe(0.75)

      x.set(100)
      await delay(50)
      expect(result.opacity.get()).toBe(1)
      expect(result.scale.get()).toBe(1)
      dispose()
    })

    it('supports an accessor inputRange with multi-output', () => {
      const x = motionValue(50)
      const [inputRange, setInputRange] = createSignal([0, 100])
      const { result, dispose } = inRoot(() => createTransform(x, inputRange, {
        opacity: [0, 1],
        scale: [0.5, 1],
      }))

      expect(result.opacity.get()).toBe(0.5)
      expect(result.scale.get()).toBe(0.75)

      setInputRange([0, 50])
      flush()
      expect(result.opacity.get()).toBe(1)
      expect(result.scale.get()).toBe(1)
      dispose()
    })

    it('supports an accessor output range per key', () => {
      const x = motionValue(100)
      const [range, setRange] = createSignal([0, 1])
      const { result, dispose } = inRoot(() => createTransform(x, [0, 100], { opacity: range }))
      expect(result.opacity.get()).toBe(1)
      setRange([0, 2])
      flush()
      expect(result.opacity.get()).toBe(2)
      dispose()
    })

    it('respects clamp options', () => {
      const x = motionValue(150)
      const clamped = inRoot(() => createTransform(x, [0, 100], { opacity: [0, 1] }, { clamp: true }))
      expect(clamped.result.opacity.get()).toBe(1)
      const unclamped = inRoot(() => createTransform(x, [0, 100], { opacity: [0, 1] }, { clamp: false }))
      expect(unclamped.result.opacity.get()).toBeGreaterThan(1)
      clamped.dispose()
      unclamped.dispose()
    })

    it('handles non-numeric output ranges', async () => {
      const x = motionValue(0)
      const { result, dispose } = inRoot(() => createTransform(x, [0, 100], {
        backgroundColor: ['#000000', '#ffffff'],
        borderRadius: ['0px', '10px'],
      }))

      expect(result.backgroundColor.get()).toBe('rgba(0, 0, 0, 1)')
      expect(result.borderRadius.get()).toBe('0px')

      x.set(50)
      await delay(50)
      expect(result.backgroundColor.get()).toBe('rgba(180, 180, 180, 1)')
      expect(result.borderRadius.get()).toBe('5px')
      dispose()
    })
  })
})
