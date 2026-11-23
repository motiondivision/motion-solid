import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Show, createSignal, flush } from 'solid-js'
import { render, cleanup } from '@solidjs/testing-library'
import { motion } from '@/components/motion'
import { AnimatePresence } from '@/components/animate-presence'
import { LayoutGroup } from '@/components/LayoutGroup'
import { ExitFeature } from '@/features/exit/exit'
import { delay } from '@/shared/test'

// jsdom has no layout: place an element by its data-x / data-y so a layoutId handoff has
// two different boxes to animate between.
const originalRect = Element.prototype.getBoundingClientRect
beforeEach(() => {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const x = Number((this as HTMLElement).dataset.x ?? 0)
    const y = Number((this as HTMLElement).dataset.y ?? 0)
    return { x, y, left: x, top: y, right: x + 100, bottom: y + 100, width: 100, height: 100, toJSON() {} } as DOMRect
  }
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.isConnected ? document.body : null
    },
  })
})
afterEach(() => {
  cleanup()
  Element.prototype.getBoundingClientRect = originalRect
  vi.restoreAllMocks()
})

describe('shared layout exit handoff', () => {
  it('removes the exiting layoutId element once the handoff completes', async () => {
    const complete = vi.spyOn(ExitFeature.prototype, 'completeExitFromProjection')
    const [side, setSide] = createSignal<'a' | 'b'>('a')
    render(() => (
      <LayoutGroup>
        <AnimatePresence>
          <Show when={side() === 'a'}>
            <motion.div class="a" data-x="0" data-y="0" layoutId="box" exit={{ opacity: 0.99, transition: { duration: 0 } }} transition={{ layout: { duration: 0.3 } }} />
          </Show>
        </AnimatePresence>
        <Show when={side() === 'b'}>
          <motion.div class="b" data-x="300" data-y="200" layoutId="box" transition={{ layout: { duration: 0.3 } }} />
        </Show>
      </LayoutGroup>
    ))
    flush()
    await delay(50)
    const a = document.querySelector('.a') as HTMLElement
    expect(a).not.toBeNull()

    setSide('b')
    flush()
    await delay(600)
    expect(complete).toHaveBeenCalled()
    expect(a.isConnected).toBe(false)
  })
})
