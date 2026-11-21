// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToString } from '@solidjs/web'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'

const keys = (html: string) => [...html.matchAll(/_hk="([^"]+)"/g)].map(m => m[1])

describe('AnimatePresence server ids', () => {
  for (const mode of ['sync', 'wait', 'popLayout'] as const) {
    it(`gives its children the ids the client presence layer produces (${mode})`, () => {
      const html = renderToString(() => (
        <AnimatePresence mode={mode}>
          <Motion id="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>a</Motion>
        </AnimatePresence>
      ))
      // Verified against the client in animate-presence.hydrate.test.tsx (same markup, same ids).
      expect(keys(html)).toEqual(['20720'])
    })
  }
})
