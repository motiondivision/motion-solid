import { describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motion } from '@/components/motion'

describe('transformTemplate', () => {
  it('formats the initial transform and keeps it when children change', () => {
    const [label, setLabel] = createSignal('a')
    const { container } = render(() => (
      <motion.div
        style={{ x: 10 }}
        transformTemplate={(_: unknown, generated: string) => `${generated} rotate(1deg)`}
      >
        {label()}
      </motion.div>
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.style.transform).toBe('translateX(10px) rotate(1deg)')

    setLabel('b')
    flush()
    expect(el.textContent).toBe('b')
    expect(el.style.transform).toBe('translateX(10px) rotate(1deg)')
  })
})
