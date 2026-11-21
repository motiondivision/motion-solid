import { describe, expect, it } from 'vitest'
import { createRoot } from 'solid-js'
import { createTime } from '../use-time'
import { delay } from '@/shared/test'

describe('createTime', () => {
  it('starts at 0 and advances with animation frames', async () => {
    const { time, dispose } = createRoot(dispose => ({ time: createTime(), dispose }))
    expect(time.get()).toBe(0)
    await delay(100)
    expect(time.get()).toBeGreaterThan(0)
    dispose()
  })

  it('stops advancing after the owner is disposed', async () => {
    const { time, dispose } = createRoot(dispose => ({ time: createTime(), dispose }))
    await delay(60)
    dispose()
    const stopped = time.get()
    await delay(80)
    expect(time.get()).toBe(stopped)
  })
})
