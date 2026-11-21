import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush, Show } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'
import { delay } from '@/shared/test'

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? document.body : null
  },
})

// jsdom has no UA stylesheet defaults, so a never-styled element reads opacity "". A browser
// reports "1"; emulate that so an exit-only element has a readable origin.
const realGetComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
  const style = realGetComputedStyle(el, pseudo)
  return new Proxy(style, {
    get(target, key) {
      if (key === 'opacity')
        return target.opacity || '1'
      if (key === 'getPropertyValue')
        return (name: string) => (name === 'opacity' ? target.getPropertyValue(name) || '1' : target.getPropertyValue(name))
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}) as typeof window.getComputedStyle

describe('exit-only motion element', () => {
  for (const mode of ['sync', 'popLayout', 'wait'] as const) {
    it(`runs its exit before removal (${mode})`, async () => {
      const onAnimationComplete = vi.fn()
      const [show, setShow] = createSignal(true)
      render(() => (
        <AnimatePresence mode={mode}>
          <Show when={show()}>
            <Motion class="x" exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onAnimationComplete={onAnimationComplete} />
          </Show>
        </AnimatePresence>
      ))
      await delay(30)
      const el = document.querySelector('.x') as HTMLElement
      setShow(false)
      flush()
      await delay(60)
      expect(el.isConnected).toBe(true)
      await delay(400)
      expect(el.isConnected).toBe(false)
      expect(onAnimationComplete).toHaveBeenCalled()
    })
  }

  it('animates an exit-only x from its resting position', async () => {
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence>
        <Show when={show()}>
          <Motion class="x" exit={{ x: 100 }} transition={{ duration: 0.2 }} />
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    const el = document.querySelector('.x') as HTMLElement
    setShow(false)
    flush()
    await delay(60)
    expect(el.isConnected).toBe(true)
    await delay(400)
    expect(el.isConnected).toBe(false)
    expect(el.style.transform).toContain('100px')
  })
})
