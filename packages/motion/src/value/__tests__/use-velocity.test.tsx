import { describe, expect, it } from 'vitest'
import { createRoot } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createVelocity } from '../use-velocity'
import { delay } from '@/shared/test'

describe('createVelocity', () => {
  it('starts at the source velocity', () => {
    const x = motionValue(0)
    createRoot((dispose) => {
      expect(createVelocity(x).get()).toBe(0)
      dispose()
    })
  })

  it('reports non-zero velocity when the source changes, then settles back to zero', async () => {
    const x = motionValue(0)
    const { velocity, dispose } = createRoot(dispose => ({ velocity: createVelocity(x), dispose }))

    x.set(100)
    await delay(20)
    x.set(200)
    await delay(20)
    expect(velocity.get()).not.toBe(0)
    expect(Number.isFinite(velocity.get())).toBe(true)

    // Velocity decays to zero once the source stops changing.
    await delay(300)
    expect(velocity.get()).toBe(0)
    dispose()
  })

  it('stops tracking after the owner is disposed', async () => {
    const x = motionValue(0)
    const { velocity, dispose } = createRoot(dispose => ({ velocity: createVelocity(x), dispose }))
    dispose()
    x.set(100)
    await delay(50)
    expect(velocity.get()).toBe(0)
  })
})
