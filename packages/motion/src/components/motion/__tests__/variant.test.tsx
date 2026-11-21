import { describe, expect, it } from 'vitest'
import { For, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue, stagger } from 'framer-motion/dom'
import { Motion } from '@/components/motion'

function equidistant(delayedBy: number[], staggerDuration: number) {
  let isEquidistant = true
  let prev = 0
  for (let i = 0; i < delayedBy.length; i++) {
    if (prev) {
      const timeSincePrev = prev - delayedBy[i]
      if (Math.round(timeSincePrev / 100) * 100 !== staggerDuration * 1000)
        isEquidistant = false
    }
    prev = delayedBy[i]
  }
  return isEquidistant
}

describe('animate prop as variant', () => {
  it('when: beforeChildren works correctly', async () => {
    const opacity = motionValue(0.1)
    const variants = {
      visible: { opacity: 1, transition: { duration: 1, when: 'beforeChildren' } },
      hidden: { opacity: 0.1 },
    }
    render(() => (
      <Motion variants={variants} initial="hidden" animate="visible">
        <Motion>
          <Motion variants={variants} style={{ opacity }} />
        </Motion>
      </Motion>
    ))
    await new Promise(r => setTimeout(r, 200))
    expect(opacity.get()).toBe(0.1)
  })

  it('components without variants are transparent to stagger order', async () => {
    const [recordedOrder, staggeredEqually] = await new Promise<[number[], boolean]>((resolve) => {
      const order: number[] = []
      const delayedBy: number[] = []
      const staggerDuration = 0.1
      const mark = (i: number) => {
        if (!delayedBy[i])
          delayedBy[i] = performance.now()
      }
      const parentVariants = {
        visible: { transition: { staggerChildren: staggerDuration, staggerDirection: -1 } },
      }
      const variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.000001 } },
      }
      const item = (i: number) => (
        <Motion
          variants={variants}
          onUpdate={() => {
            mark(i - 1)
            order.push(i)
          }}
          style={{ willChange: 'auto' }}
        />
      )
      render(() => (
        <Motion
          initial="hidden"
          animate="visible"
          variants={parentVariants}
          onAnimationComplete={() =>
            requestAnimationFrame(() => resolve([order, equidistant(delayedBy, staggerDuration)]))}
        >
          <Motion>
            <Motion />
            {item(1)}
            {item(2)}
          </Motion>
          <Motion>
            {item(3)}
            {item(4)}
          </Motion>
        </Motion>
      ))
    })
    expect(recordedOrder).toEqual([4, 3, 2, 1])
    expect(staggeredEqually).toBe(true)
  })

  it('child variants with value-specific transitions correctly calculate delay based on staggerChildren', async () => {
    const childVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { opacity: { duration: 0.1 } } },
    }
    const a = motionValue(0)
    const b = motionValue(0)
    const result = await new Promise<boolean>((resolve) => {
      a.on('change', (latest) => {
        if (latest >= 1 && b.get() === 0)
          resolve(true)
      })
      render(() => (
        <Motion
          variants={{ hidden: {}, visible: { x: 100, transition: { staggerChildren: 0.15 } } }}
          initial="hidden"
          animate="visible"
        >
          <Motion variants={childVariants} style={{ opacity: a }} />
          <Motion variants={childVariants} style={{ opacity: b }} />
        </Motion>
      ))
    })
    expect(result).toBe(true)
  })

  it('child variants with stagger function passed to delayChildren work correctly', async () => {
    const [recordedOrder, staggeredEqually] = await new Promise<[number[], boolean]>((resolve) => {
      const order: number[] = []
      const delayedBy: number[] = []
      const staggerDuration = 0.1
      const mark = (i: number) => {
        if (!delayedBy[i])
          delayedBy[i] = performance.now()
      }
      const variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.000001 } },
      }
      render(() => (
        <Motion
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { delayChildren: stagger(staggerDuration, { from: 'last' }) } } }}
          onAnimationComplete={() =>
            requestAnimationFrame(() => resolve([order, equidistant(delayedBy, staggerDuration)]))}
        >
          <For each={[1, 2, 3, 4]}>
            {i => (
              <Motion
                variants={variants}
                onUpdate={() => {
                  mark(i - 1)
                  order.push(i)
                }}
                style={{ willChange: 'auto' }}
              />
            )}
          </For>
        </Motion>
      ))
    })
    expect(recordedOrder).toEqual([4, 3, 2, 1])
    expect(staggeredEqually).toBe(true)
  })

  it('stagger function with different "from" options work correctly', async () => {
    const variants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.000001 } },
    }
    const run = (from: 'center' | 'first') => new Promise<number[]>((resolve) => {
      const order: number[] = []
      render(() => (
        <Motion
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { delayChildren: stagger(0.1, { from }) } } }}
          onAnimationComplete={() => resolve(order)}
        >
          <For each={[1, 2, 3, 4]}>
            {i => <Motion variants={variants} onUpdate={() => order.push(i)} style={{ willChange: 'auto' }} />}
          </For>
        </Motion>
      ))
    })
    const [center, first] = await Promise.all([run('center'), run('first')])
    expect(center).toEqual([2, 3, 1, 4])
    expect(first).toEqual([1, 2, 3, 4])
  })

  it('staggerChildren is calculated correctly for new children', async () => {
    const [items, setItems] = createSignal(['1', '2'])
    const started: Record<string, number> = {}
    render(() => (
      <Motion animate="enter" variants={{ enter: { transition: { delayChildren: stagger(0.1) } } }}>
        <For each={items()}>
          {item => (
            <Motion
              variants={{ enter: { opacity: 1, transition: { duration: 0.01 } } }}
              initial={{ opacity: 0 }}
              onUpdate={() => {
                started[item] ??= performance.now()
              }}
            />
          )}
        </For>
      </Motion>
    ))
    await new Promise(r => setTimeout(r, 300))
    setItems(['1', '2', '3', '4', '5'])
    flush()
    await new Promise(r => setTimeout(r, 800))
    const times = ['3', '4', '5'].map(k => started[k])
    expect(times.every(t => typeof t === 'number')).toBe(true)
    // each new child starts one stagger step (100ms) after the previous one
    expect(times[1] - times[0]).toBeGreaterThan(60)
    expect(times[2] - times[1]).toBeGreaterThan(60)
  })
})
