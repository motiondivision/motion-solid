import { describe, expect, it, vi } from 'vitest'
import { hydrate } from '@solidjs/web'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'

// Markup produced by the server for the same tree (see animate-presence.hydrate.ssr.test.tsx).
// `wait` hydrates inside a Loading boundary, so its ids sit one level deeper.
const serverHtml = (mode: string) => `<div _hk=${mode === 'wait' ? '220000820' : '220820'} id="a" style="opacity:0">a</div>`

describe('AnimatePresence hydration', () => {
  for (const mode of ['sync', 'wait', 'popLayout'] as const) {
    it(`claims the server nodes without hydration warnings (${mode})`, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const root = document.createElement('div')
      root.innerHTML = serverHtml(mode)
      const before = root.firstElementChild
      ;(globalThis as any)._$HY = { events: [], completed: new WeakSet(), r: {}, done: false }
      const dispose = hydrate(() => (
        <AnimatePresence mode={mode}>
          <Motion id="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>a</Motion>
        </AnimatePresence>
      ), root)
      const calls = [...warn.mock.calls, ...error.mock.calls].map(c => String(c[0]))
      warn.mockRestore()
      error.mockRestore()
      expect(calls).toEqual([])
      expect(root.firstElementChild).toBe(before)
      dispose()
    })
  }
})
