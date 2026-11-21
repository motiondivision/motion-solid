import { describe, expect, it } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { createMotionTemplate } from '../use-motion-template'
import { delay } from '@/shared/test'

describe('createMotionTemplate', () => {
  it('builds a string from MotionValues and plain values', async () => {
    const x = motionValue(1)
    const y = motionValue(2)
    createRoot((dispose) => {
      const template = createMotionTemplate`translate(${x}px, ${y}px) scale(${1.5}) ${'end'}`
      expect(template.get()).toBe('translate(1px, 2px) scale(1.5) end')
      dispose()
    })
  })

  it('keeps plain zero values', () => {
    createRoot((dispose) => {
      expect(createMotionTemplate`a${0}b`.get()).toBe('a0b')
      dispose()
    })
  })

  it('updates when a MotionValue changes', async () => {
    const x = motionValue(1)
    const { template, dispose } = createRoot(dispose => ({ template: createMotionTemplate`${x}px`, dispose }))
    x.set(50)
    await delay(50)
    expect(template.get()).toBe('50px')
    dispose()
  })

  it('updates when an accessor value changes', () => {
    const [n, setN] = createSignal(1)
    const { template, dispose } = createRoot(dispose => ({ template: createMotionTemplate`${n}deg`, dispose }))
    expect(template.get()).toBe('1deg')
    setN(90)
    flush()
    expect(template.get()).toBe('90deg')
    dispose()
  })
})
