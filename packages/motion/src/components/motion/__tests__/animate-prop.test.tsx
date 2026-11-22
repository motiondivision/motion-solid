import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'framer-motion/dom'
import { Motion } from '@/components/motion'
import { delay } from '@/shared/test'

describe('animate prop as object', () => {
  it('animates to set prop', async () => {
    const x = motionValue(0)
    const promise = new Promise((resolve) => {
      render(() => <Motion animate={{ x: 20 }} style={{ x }} onAnimationComplete={() => resolve(x.get())} />)
    })
    await expect(promise).resolves.toBe(20)
  })

  it('writes the animated value to the DOM', async () => {
    const x = motionValue(0)
    const done = new Promise<void>((resolve) => {
      render(() => <Motion data-testid="a" animate={{ x: 20 }} transition={{ duration: 0.01 }} style={{ x }} onAnimationComplete={() => resolve()} />)
    })
    await done
    await delay(30)
    const el = document.querySelector('[data-testid="a"]') as HTMLElement
    expect(el.style.transform).toBe('translateX(20px)')
  })

  it('accepts custom transition prop', async () => {
    const x = motionValue(0)
    const promise = new Promise((resolve) => {
      render(() => (
        <Motion
          animate={{ x: 20 }}
          transition={{ x: { type: 'tween', from: 10, ease: () => 0.5 } }}
          style={{ x }}
          onUpdate={() => resolve(x.get())}
        />
      ))
    })
    await expect(promise).resolves.toBe(15)
  })

  it('fires onAnimationStart when animation begins', async () => {
    const onStart = vi.fn()
    const promise = new Promise((resolve) => {
      render(() => (
        <Motion
          animate={{ x: 20 }}
          transition={{ type: false }}
          onAnimationStart={onStart}
          onAnimationComplete={() => resolve(onStart)}
        />
      ))
    })
    await expect(promise).resolves.toHaveBeenCalledTimes(1)
  })

  it('animates again when the animate prop changes', async () => {
    const x = motionValue(0)
    const [target, setTarget] = createSignal(10)
    render(() => <Motion style={{ x }} animate={{ x: target(), transition: { type: false } }} />)
    await delay(50)
    expect(x.get()).toBe(10)
    setTarget(20)
    flush()
    await delay(50)
    expect(x.get()).toBe(20)
    setTarget(30)
    flush()
    await delay(50)
    expect(x.get()).toBe(30)
  })

  it('uses transitionEnd on subsequent changes', async () => {
    const x = motionValue(0)
    const [target, setTarget] = createSignal(10)
    render(() => (
      <Motion
        style={{ x }}
        animate={{ x: target(), transition: { type: false }, transitionEnd: { x: target() * 10 } }}
      />
    ))
    await delay(50)
    expect(x.get()).toBe(100)
    setTarget(20)
    flush()
    await delay(50)
    expect(x.get()).toBe(200)
    setTarget(30)
    flush()
    await delay(50)
    expect(x.get()).toBe(300)
  })

  it('transition accepts manual from value', async () => {
    const output: number[] = []
    const promise = new Promise((resolve) => {
      render(() => (
        <Motion
          animate={{ x: 50 }}
          transition={{ from: 0, ease: 'linear' }}
          onUpdate={(v: { x: number }) => output.push(v.x)}
          onAnimationComplete={() => resolve(output.every(v => v <= 50))}
        />
      ))
    })
    await expect(promise).resolves.toBe(true)
  })

  it('animates through variant array', async () => {
    const x = motionValue(0)
    const y = motionValue(0)
    const promise = new Promise<{ x: number, y: number }>((resolve) => {
      render(() => (
        <Motion
          animate={['default', 'open']}
          variants={{ default: { x: 10 }, open: { y: 20 } }}
          style={{ x, y }}
          onAnimationComplete={() => resolve({ x: x.get(), y: y.get() })}
        />
      ))
    })
    const result = await promise
    expect(result.x).toBe(10)
    expect(result.y).toBe(20)
  })

  it('child Motion initial prop should not be affected by parent Motion initial=false', async () => {
    const childX = motionValue(0)
    render(() => (
      <Motion initial={false} animate={{ x: 100 }}>
        <Motion animate={{ x: 50 }} style={{ x: childX }} />
      </Motion>
    ))
    expect(childX.get()).toBeLessThan(50)
  })

  it('parent variants control should effect child animate state', async () => {
    const childX = motionValue(0)
    render(() => (
      <Motion initial={false} animate="animate">
        <Motion variants={{ animate: { x: 100 } }} style={{ x: childX }} />
      </Motion>
    ))
    expect(childX.get()).toBe(100)
  })
})
