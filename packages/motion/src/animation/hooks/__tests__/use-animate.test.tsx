import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { flush, onSettled } from 'solid-js'
import { motionValue } from 'framer-motion/dom'
import { MotionConfigContext } from '@/components/motion-config/context'
import { createAnimate } from '../use-animate'
import { delay } from '@/shared/test'

function setup(config: Record<string, unknown>) {
  let animate!: ReturnType<typeof createAnimate>[1]
  let scope!: ReturnType<typeof createAnimate>[0]
  function Child() {
    const [s, a] = createAnimate()
    scope = s
    animate = a
    return <ul ref={s}><li class="a" /><li class="b" /></ul>
  }
  const result = render(() => (
    <MotionConfigContext value={() => config}>
      <Child />
    </MotionConfigContext>
  ))
  flush()
  return { animate: () => animate, scope: () => scope, ...result }
}

describe('createAnimate', () => {
  it('applies final value instantly when skipAnimations is set', async () => {
    const { animate } = setup({ skipAnimations: true })
    const value = motionValue(0)
    animate()(value, 100, { duration: 10 })
    await delay(50)
    expect(value.get()).toBe(100)
  })

  it('animates over time when skipAnimations is not set', async () => {
    const { animate } = setup({})
    const value = motionValue(0)
    animate()(value, 100, { duration: 10 })
    await delay(50)
    expect(value.get()).toBeLessThan(100)
  })

  it('works as a ref and queries selectors inside the scope', async () => {
    const { animate, scope, container } = setup({ skipAnimations: true })
    expect(scope().current).toBe(container.querySelector('ul'))
    animate()('.a', { opacity: 0.5 }, { duration: 0 })
    await delay(50)
    expect((container.querySelector('.a') as HTMLElement).style.opacity).toBe('0.5')
    expect((container.querySelector('.b') as HTMLElement).style.opacity).toBe('')
  })

  it('stops scope animations on cleanup', () => {
    const { animate, scope, unmount } = setup({})
    animate()(motionValue(0), 100, { duration: 10 })
    const animation = scope().animations[0]
    expect(animation).toBeDefined()
    let stopped = false
    const stop = animation.stop.bind(animation)
    animation.stop = () => { stopped = true; stop() }
    unmount()
    expect(stopped).toBe(true)
  })
})
