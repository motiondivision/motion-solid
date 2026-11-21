// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { renderToString } from '@solidjs/web'
import { Motion, motion } from '@/components/motion'

describe('server render', () => {
  it('renders the initial style, fx marker and children', () => {
    const html = renderToString(() => (
      <Motion class="c" fx initial={{ opacity: 0.5, x: 10 }} animate={{ opacity: 1 }} style={{ color: 'red' }}>
        hello
      </Motion>
    ))
    expect(html).toContain('opacity:0.5')
    expect(html).toContain('translateX(10px)')
    expect(html).toContain('color:red')
    expect(html).toContain('fx')
    expect(html).toContain('hello')
  })

  it('renders svg attributes motion moves out of style, and no children for void tags', () => {
    const svg = renderToString(() => <Motion as="path" style={{ stroke: 'red' }} />)
    expect(svg).toContain('stroke="red"')
    const input = renderToString(() => <motion.input value="v">child</motion.input>)
    expect(input).not.toContain('child')
  })
})
