import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'framer-motion/dom'
import { LazyMotion } from '@/components/lazy-motion'
import { m } from '@/components/motion/m'
import { motion } from '@/components/motion'
import { domAnimation, domMax } from '@/features'

/** Resolves with the animated value on completion, or `fallback` after `timeout` ms. */
function animateX(Wrap: (props: { children: any }) => any, timeout?: number) {
  return new Promise((resolve) => {
    const x = motionValue(0)
    render(() => (
      <Wrap>
        <m.div
          animate={{ x: 20 }}
          transition={{ duration: 0.01 }}
          style={{ x }}
          onAnimationComplete={() => resolve(x.get())}
        />
      </Wrap>
    ))
    if (timeout)
      setTimeout(() => resolve(x.get()), timeout)
  })
}

describe('lazy feature loading with m component', () => {
  it('doesn\'t animate without loaded features', async () => {
    await expect(animateX(props => <>{props.children}</>, 50)).resolves.not.toBe(20)
  })

  it('does animate with synchronously-loaded domAnimation', async () => {
    await expect(animateX(props => <LazyMotion features={domAnimation}>{props.children}</LazyMotion>)).resolves.toBe(20)
  })

  it('does animate with synchronously-loaded domMax', async () => {
    await expect(animateX(props => <LazyMotion features={domMax}>{props.children}</LazyMotion>)).resolves.toBe(20)
  })

  it('doesn\'t throw without strict mode', async () => {
    await expect(animateX(props => <LazyMotion features={domMax}>{props.children}</LazyMotion>)).resolves.toBe(20)
  })

  it('supports nested feature sets', async () => {
    await expect(animateX(props => (
      <LazyMotion features={domAnimation}>
        <LazyMotion features={domMax}>{props.children}</LazyMotion>
      </LazyMotion>
    ))).resolves.toBe(20)
  })

  it('animates after async loading from a loader function', async () => {
    await expect(animateX(props => (
      <LazyMotion features={() => import('@/features/dom-animation').then(mod => mod.domAnimation)}>
        {props.children}
      </LazyMotion>
    ))).resolves.toBe(20)
  })

  it('animates after async loading from a promise', async () => {
    const features = Promise.resolve(domAnimation)
    await expect(animateX(props => <LazyMotion features={features}>{props.children}</LazyMotion>)).resolves.toBe(20)
  })

  it('does not animate before the async features resolve, and does once they do', async () => {
    let resolveFeatures!: (bundle: typeof domAnimation) => void
    const features = new Promise<typeof domAnimation>((resolve) => { resolveFeatures = resolve })
    const x = motionValue(0)
    const done = vi.fn()
    render(() => (
      <LazyMotion features={features}>
        <m.div animate={{ x: 20 }} transition={{ duration: 0.01 }} style={{ x }} onAnimationComplete={done} />
      </LazyMotion>
    ))
    await new Promise(r => setTimeout(r, 50))
    expect(x.get()).toBe(0)
    expect(done).not.toHaveBeenCalled()
    resolveFeatures(domAnimation)
    await new Promise(r => setTimeout(r, 100))
    expect(x.get()).toBe(20)
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('follows a changed features prop and ignores a stale promise', async () => {
    let resolveSlow!: (bundle: typeof domAnimation) => void
    const slow = new Promise<typeof domAnimation>((resolve) => { resolveSlow = resolve })
    const [features, setFeatures] = createSignal<any>(slow)
    const x = motionValue(0)
    render(() => (
      <LazyMotion features={features()}>
        <m.div animate={{ x: 20 }} transition={{ type: false }} style={{ x }} />
      </LazyMotion>
    ))
    setFeatures(domAnimation)
    flush()
    await new Promise(r => setTimeout(r, 50))
    expect(x.get()).toBe(20)
    resolveSlow(domMax)
    await new Promise(r => setTimeout(r, 20))
    expect(x.get()).toBe(20)
  })
})

describe('lazy feature loading with motion component', () => {
  it('throws in strict mode', () => {
    expect(() => render(() => (
      <LazyMotion features={domMax} strict>
        <motion.div animate={{ x: 20 }} />
      </LazyMotion>
    ))).toThrowError(/LazyMotion/)
  })

  it('warns instead of throwing when ignoreStrict is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => render(() => (
      <LazyMotion features={domMax} strict>
        <motion.div ignoreStrict animate={{ x: 20 }} />
      </LazyMotion>
    ))).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
