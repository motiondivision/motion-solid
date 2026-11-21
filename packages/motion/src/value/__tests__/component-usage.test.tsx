import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/web'
import { motionValue } from 'motion-dom'
import {
  createComputedMotionValue,
  createMotionTemplate,
  createMotionValueEvent,
  createScroll,
  createSpring,
  createTime,
  createTransform,
  createVelocity,
} from '..'

describe('value primitives inside a component body', () => {
  afterEach(() => vi.restoreAllMocks())

  it('creates every primitive with accessor inputs without reactivity warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const [n, setN] = createSignal(10)
    const [range] = createSignal([0, 100])
    const x = motionValue(50)
    let out!: { opacity: any, doubled: any, template: any, spring: any }

    const dispose = render(() => {
      createScroll(() => ({ axis: 'y' }))
      createTime()
      createVelocity(x)
      createMotionValueEvent(x, 'change', () => {})
      out = {
        opacity: createTransform(x, range, [0, 1]),
        doubled: createComputedMotionValue(() => n() * 2),
        template: createMotionTemplate`${n}px`,
        spring: createSpring(n),
      }
      return <div />
    }, document.createElement('div'))
    flush()

    expect(out.opacity.get()).toBe(0.5)
    expect(out.doubled.get()).toBe(20)
    expect(out.template.get()).toBe('10px')
    expect(out.spring.get()).toBe(10)

    setN(20)
    flush()
    expect(out.doubled.get()).toBe(40)
    expect(out.template.get()).toBe('20px')

    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    dispose()
  })
})
