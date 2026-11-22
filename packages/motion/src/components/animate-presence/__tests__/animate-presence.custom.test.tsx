import { describe, expect, it } from 'vitest'
import { createSignal, flush, For, OBSERVE, Show } from 'solid-js'
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

describe('AnimatePresence custom', () => {
  it('reads a signal-backed custom without untracked-read diagnostics in wait mode', async () => {
    const [k, setK] = createSignal(0)
    const cap = (OBSERVE as any).diagnostics.capture()
    render(() => (
      <AnimatePresence mode="wait" custom={k()}>
        <For each={[k()]}>
          {item => (
            <Motion initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.01 }}>
              {item}
            </Motion>
          )}
        </For>
      </AnimatePresence>
    ))
    flush()
    await delay(20)
    setK(1)
    flush()
    await delay(60)
    flush()
    const result = cap.stop()
    const events = JSON.stringify(result)
    expect(events).not.toContain('STRICT_READ_UNTRACKED')
  })

  for (const mode of ['sync', 'wait', 'popLayout'] as const) {
    it(`exits the leaving child with the custom value changed in the same update (${mode})`, async () => {
      const [dir, setDir] = createSignal(1)
      const [key, setKey] = createSignal('a')
      const { container } = render(() => (
        <AnimatePresence mode={mode} custom={dir()}>
          <Show when={key()} keyed>
            {k => (
              <Motion
                data-k={k}
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit="out"
                variants={{ out: (d: number) => ({ x: d * 100 }) }}
                transition={{ duration: 0.1 }}
              />
            )}
          </Show>
        </AnimatePresence>
      ))
      await delay(100)
      const a = container.querySelector<HTMLElement>('[data-k="a"]')!
      setDir(-1)
      setKey('b')
      flush()
      await delay(300)
      expect(a.style.transform).toContain('-100px')
    })
  }
})
