import { describe, expect, it } from 'vitest'
import { createSignal, flush, OBSERVE } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { LazyMotion } from '@/components/lazy-motion'
import { MotionConfig } from '@/components/motion-config'
import { m } from '@/components/motion/m'
import { domAnimation } from '@/features'
import { delay } from '@/shared/test'

describe('LazyMotion and MotionConfig diagnostics', () => {
  it('emits no Solid diagnostics for sync, promise and loader features or changing config', async () => {
    const capture = (OBSERVE as any).diagnostics.capture()
    const [duration, setDuration] = createSignal(0.01)
    const [features, setFeatures] = createSignal<any>(domAnimation)
    render(() => (
      <MotionConfig transition={{ duration: duration() }} reducedMotion="user">
        <LazyMotion features={features()} strict>
          <m.div animate={{ x: 10 }} />
        </LazyMotion>
      </MotionConfig>
    ))
    flush()
    setFeatures(() => Promise.resolve(domAnimation))
    setDuration(0.02)
    flush()
    await delay(20)
    setFeatures({ renderer: domAnimation.renderer, features: domAnimation.features })
    flush()
    await delay(20)
    expect(capture.stop()).toEqual([])
  })
})
