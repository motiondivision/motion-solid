import { describe, expect, it } from 'vitest'
import { createSignal, flush, OBSERVE } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { MotionConfig } from '@/components/motion-config'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'
import { mountedStates } from '@/state/motion-state'

const pagePointOf = (el: Element | null) =>
  (mountedStates.get(el!)?.visualElement as unknown as { props: { transformPagePoint?: unknown } }).props.transformPagePoint

describe('MotionConfig transformPagePoint', () => {
  it('reaches every motion child, nested ones and those under AnimatePresence, and follows changes', () => {
    const first = (p: { x: number, y: number }) => p
    const second = (p: { x: number, y: number }) => ({ x: p.x * 2, y: p.y * 2 })
    const [transform, setTransform] = createSignal({ fn: first })
    const capture = (OBSERVE as any).diagnostics.capture()
    const { container } = render(() => (
      <MotionConfig transformPagePoint={transform().fn}>
        <Motion class="outer" drag>
          <Motion class="inner" drag />
        </Motion>
        <AnimatePresence>
          <Motion class="presence" drag />
        </AnimatePresence>
      </MotionConfig>
    ))
    flush()
    for (const selector of ['.outer', '.inner', '.presence'])
      expect(pagePointOf(container.querySelector(selector))).toBe(first)
    setTransform({ fn: second })
    flush()
    for (const selector of ['.outer', '.inner', '.presence'])
      expect(pagePointOf(container.querySelector(selector))).toBe(second)
    expect(JSON.stringify(capture.stop())).not.toContain('STRICT_READ_UNTRACKED')
  })

  it('is inherited by a nested MotionConfig that does not set it', () => {
    const transform = (p: { x: number, y: number }) => p
    const { container } = render(() => (
      <MotionConfig transformPagePoint={transform}>
        <MotionConfig reducedMotion="never">
          <Motion class="child" drag />
        </MotionConfig>
      </MotionConfig>
    ))
    flush()
    expect(pagePointOf(container.querySelector('.child'))).toBe(transform)
  })
})
