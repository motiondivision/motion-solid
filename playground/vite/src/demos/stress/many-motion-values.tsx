import { createSignal, For, onSettled, Show } from 'solid-js'
import { createMotionValue, createMotionValueEvent, createTransform, motion } from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'many-motion-values',
  title: 'Many motion values (createTransform chains)',
  group: 'stress',
  description:
    'Chains of identity createTransform values (chains x depth, default 10 x 100 = 1000 values) driven from one source on every frame. Chain ends must equal the source; the fps meter shows the cost.',
  covers: ['createMotionValue', 'createMotionValueEvent', 'createTransform', 'motion'],
} as const

const DEPTH = 100
const counters = { updates: 0 }

function Chain(props: { source: MotionValue<number>; index: number; ends: MotionValue<number>[] }) {
  // Identity mapping over [0, 100]: any drift between the end and the source means a chain broke.
  let tail = props.source
  for (let i = 0; i < DEPTH; i++) tail = createTransform(tail, [0, 100], [0, 100])
  const end = tail
  props.ends[props.index] = end
  createMotionValueEvent(end, 'change', () => {
    counters.updates++
  })
  const x = createTransform(end, [0, 100], [0, 260])
  return (
    <div class="mv-row">
      <motion.div class="mv-dot" style={{ x, background: `hsl(${props.index * 31} 75% 55%)` }} />
    </div>
  )
}

function Run(props: { chains: number }) {
  const source = createMotionValue(0)
  const ends: MotionValue<number>[] = []
  const [view, setView] = createSignal({ fps: 0, worst: 0, updates: 0, src: 0, maxDrift: 0, frames: 0 })

  onSettled(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let frames = 0
    let totalFrames = 0
    let worst = 0
    let t = 0
    let lastUpdates = counters.updates
    let lastPublish = last
    const tick = (now: number) => {
      const dt = now - last
      last = now
      t += dt
      // Triangle wave 0..100..0 over 4 seconds.
      const phase = (t / 4000) % 1
      source.set(100 * (phase < 0.5 ? phase * 2 : 2 - phase * 2))
      acc += dt
      frames++
      totalFrames++
      worst = Math.max(worst, dt)
      if (now - lastPublish >= 500) {
        let drift = 0
        for (const end of ends) drift = Math.max(drift, Math.abs(end.get() - source.get()))
        const updates = counters.updates
        setView({
          fps: (frames * 1000) / acc,
          worst,
          updates: ((updates - lastUpdates) * 1000) / (now - lastPublish),
          src: source.get(),
          maxDrift: drift,
          frames: totalFrames,
        })
        lastUpdates = updates
        lastPublish = now
        acc = 0
        frames = 0
        worst = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })

  const ok = () => view().maxDrift < 1e-6
  return (
    <>
      <Controls>
        <Readout label="values" value={props.chains * DEPTH + props.chains} />
        <Readout label="fps" value={view().fps.toFixed(0)} ok={view().fps >= 30} />
        <Readout label="worst frame" value={view().worst.toFixed(0) + 'ms'} />
        <Readout label="end 'change'/s" value={view().updates.toFixed(0)} />
        <Readout label="source" value={view().src.toFixed(1)} />
        <Readout label="max |end - source|" value={view().maxDrift.toExponential(1)} />
        <Readout label="chains consistent" value={ok() ? 'PASS' : 'FAIL'} ok={ok()} />
      </Controls>
      <Stage height={`${props.chains * 22 + 32}px`}>
        <div class="mv-list">
          <For each={Array.from({ length: props.chains }, (_, i) => i)}>
            {i => <Chain source={source} index={i} ends={ends} />}
          </For>
        </div>
        <style>{`.mv-list{width:100%}.mv-row{height:22px;position:relative}.mv-dot{width:16px;height:16px;border-radius:50%}`}</style>
      </Stage>
    </>
  )
}

export default function Demo() {
  const [chains, setChains] = createSignal(10)
  return (
    <>
      <Controls>
        <span>chains of {DEPTH} createTransform values (changing remounts):</span>
        <For each={[1, 5, 10, 20, 40]}>
          {n => (
            <Button pressed={chains() === n} onClick={() => setChains(n)}>
              {n} x {DEPTH} = {n * DEPTH}
            </Button>
          )}
        </For>
      </Controls>
      <Show when={chains()} keyed>
        {n => <Run chains={n} />}
      </Show>
    </>
  )
}
