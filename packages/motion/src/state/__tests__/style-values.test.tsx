import { describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'motion-dom'
import { motion } from '@/components/motion'
import { delay } from '@/shared/test'

describe('style MotionValues and transitionEnd reach the DOM', () => {
  it('swapping the MotionValue in style renders the new one immediately', async () => {
    const a = motionValue(0.2)
    const b = motionValue(0.8)
    const [useA, setUseA] = createSignal(true)
    const r = render(() => <motion.div style={{ opacity: useA() ? a : b }} />)
    flush()
    await delay(40)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('0.2')
    setUseA(false)
    flush()
    await delay(40)
    expect(el.style.opacity).toBe('0.8')
    b.set(0.5)
    await delay(40)
    expect(el.style.opacity).toBe('0.5')
    a.set(0.1)
    await delay(40)
    expect(el.style.opacity).toBe('0.5')
  })

  it('removing a MotionValue from style clears its value from the DOM', async () => {
    const a = motionValue(0.3)
    const [has, setHas] = createSignal(true)
    const r = render(() => <motion.div style={has() ? { opacity: a, color: 'red' } : { color: 'red' }} />)
    flush()
    await delay(40)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('0.3')
    setHas(false)
    flush()
    await delay(40)
    expect(el.style.opacity).toBe('')
    expect(el.style.color).toBe('red')
    a.set(0.9)
    await delay(40)
    expect(el.style.opacity).toBe('')
  })

  it('transitionEnd on a key without a MotionValue is rendered', async () => {
    const r = render(() => (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transitionEnd: { display: 'none' } }}
        transition={{ duration: 0.02 }}
      />
    ))
    flush()
    await delay(200)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('1')
    expect(el.style.display).toBe('none')
  })
})
