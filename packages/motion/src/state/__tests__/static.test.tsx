import { describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'motion-dom'
import { motion } from '@/components/motion'
import { MotionConfig } from '@/components/motion-config'
import { mountedStates } from '@/state'
import { delay } from '@/shared/test'

describe('MotionConfig isStatic', () => {
  it('renders initial values and never animates', async () => {
    const r = render(() => (
      <MotionConfig isStatic>
        <motion.div initial={{ opacity: 0.25 }} animate={{ opacity: 1 }} transition={{ duration: 0.01 }} />
      </MotionConfig>
    ))
    flush()
    await delay(120)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('0.25')
    expect(mountedStates.get(el)!.visualElement).toBeUndefined()
  })

  it('renders the animate values when initial is false', async () => {
    const r = render(() => (
      <MotionConfig isStatic>
        <motion.div initial={false} animate={{ opacity: 0.5, x: 10 }} />
      </MotionConfig>
    ))
    flush()
    await delay(40)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('0.5')
    expect(el.style.transform).toContain('10px')
  })

  it('re-renders when a style MotionValue or a prop changes', async () => {
    const mv = motionValue(0.1)
    const [initialOpacity, setInitialOpacity] = createSignal(0.3)
    const r = render(() => (
      <MotionConfig isStatic>
        <motion.div style={{ scale: mv }} initial={{ opacity: initialOpacity() }} />
      </MotionConfig>
    ))
    flush()
    await delay(40)
    const el = r.container.firstElementChild as HTMLElement
    expect(el.style.transform).toContain('scale(0.1)')
    expect(el.style.opacity).toBe('0.3')
    mv.set(0.7)
    await delay(40)
    expect(el.style.transform).toContain('scale(0.7)')
    setInitialOpacity(0.6)
    flush()
    await delay(40)
    expect(el.style.opacity).toBe('0.6')
  })

  it('still animates outside a static config', async () => {
    const r = render(() => (
      <motion.div initial={{ opacity: 0.25 }} animate={{ opacity: 1 }} transition={{ duration: 0.01 }} />
    ))
    flush()
    await delay(200)
    expect((r.container.firstElementChild as HTMLElement).style.opacity).toBe('1')
  })
})
