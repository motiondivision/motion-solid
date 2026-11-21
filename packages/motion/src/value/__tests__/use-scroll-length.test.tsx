import { describe, expect, it, vi } from 'vitest'
import { createRoot, flush } from 'solid-js'
import { createScroll } from '../use-scroll'

// Uses the real framer-motion scroll (no mocks, see use-scroll.test.tsx for those).
describe('createScroll (real scroll tracking)', () => {
  it('reports each axis length as the distance left to scroll', async () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientHeight', { value: 100 })
    Object.defineProperty(container, 'scrollHeight', { value: 400 })
    Object.defineProperty(container, 'clientWidth', { value: 50 })
    Object.defineProperty(container, 'scrollWidth', { value: 250 })
    container.scrollTop = 40
    container.scrollLeft = 10
    document.body.appendChild(container)

    const lengths = { x: -1, y: -1 }
    const dispose = createRoot((dispose) => {
      const values = createScroll({ container })
      lengths.x = values.scrollXLength.get()
      lengths.y = values.scrollYLength.get()
      values.scrollXLength.on('change', (v) => { lengths.x = v })
      values.scrollYLength.on('change', (v) => { lengths.y = v })
      return dispose
    })
    flush()

    await vi.waitFor(() => {
      expect(lengths).toEqual({ x: 200, y: 300 })
    })

    dispose()
    container.remove()
  })
})
