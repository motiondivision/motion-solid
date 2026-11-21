import { describe, expect, it, vi } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createMotionValueEvent } from '../use-motion-value-event'

describe('createMotionValueEvent', () => {
  it('listens to the event synchronously', () => {
    const x = motionValue(0)
    const cb = vi.fn()
    const dispose = createRoot((dispose) => {
      createMotionValueEvent(x, 'change', cb)
      x.set(5)
      return dispose
    })
    expect(cb).toHaveBeenCalledWith(5)
    dispose()
  })

  it('unsubscribes when the owner is disposed', () => {
    const x = motionValue(0)
    const cb = vi.fn()
    const dispose = createRoot((dispose) => {
      createMotionValueEvent(x, 'change', cb)
      return dispose
    })
    dispose()
    x.set(5)
    expect(cb).not.toHaveBeenCalled()
  })

  it('moves the listener when the accessor returns a new MotionValue', () => {
    const a = motionValue(0)
    const b = motionValue(0)
    const [source, setSource] = createSignal(a)
    const cb = vi.fn()
    const dispose = createRoot((dispose) => {
      createMotionValueEvent(source, 'change', cb)
      return dispose
    })
    setSource(b)
    flush()
    a.set(1)
    expect(cb).not.toHaveBeenCalled()
    b.set(2)
    expect(cb).toHaveBeenCalledWith(2)
    dispose()
  })
})
