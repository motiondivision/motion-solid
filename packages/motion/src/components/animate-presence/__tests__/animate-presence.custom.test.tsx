import { describe, expect, it } from 'vitest'
import { createSignal, flush, For, OBSERVE } from 'solid-js'
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
})
