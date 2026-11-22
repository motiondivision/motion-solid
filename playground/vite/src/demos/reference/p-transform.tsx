import { createSignal } from 'solid-js'
import type { JSX } from '@solidjs/web'
import {
  circIn,
  createMotionTemplate,
  createMotionValue,
  createMotionValueEvent,
  createTransform,
  cubicBezier,
  motion,
} from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'p-transform',
  title: 'createTransform overloads + createMotionTemplate',
  group: 'reference',
  description:
    'Drive x (0-300) and y (0-10) with sliders and watch every createTransform overload: range map, clamp on/off, ease, mixer, colour output, output map, function of values, signal-reading function, single/array transformers and accessor ranges; createMotionTemplate builds strings.',
  covers: [
    'circIn',
    'createMotionTemplate',
    'createMotionValue',
    'createMotionValueEvent',
    'createTransform',
    'cubicBezier',
    'motion',
  ],
} as const

function live<T>(value: MotionValue<T>) {
  const [latest, setLatest] = createSignal<T>(value.get() as Exclude<T, Function>)
  createMotionValueEvent(value, 'change', next => setLatest(() => next))
  return latest as () => T
}

const fmt = (v: unknown) => (typeof v === 'number' ? v.toFixed(3) : String(v))

export default function Demo() {
  const x = createMotionValue(0)
  const y = createMotionValue(1)
  const [flip, setFlip] = createSignal(false)
  const [factor, setFactor] = createSignal(1)

  // 1. range map, clamped (default) and unclamped
  const clamped = createTransform(x, [0, 100, 200], [0, 1, 0.2])
  const unclamped = createTransform(x, [0, 100, 200], [0, 1, 0.2], { clamp: false })
  // 2. easing: single ease and an array (one per segment)
  const eased = createTransform(x, [0, 300], [0, 100], { ease: circIn })
  const easedArray = createTransform(x, [0, 150, 300], [0, 100, 0], { ease: [cubicBezier(0.9, 0, 0.1, 1), (t: number) => t] })
  // 3. custom mixer: snap to the "from" value until the very end
  const mixed = createTransform(x, [0, 300], [0, 100], { mixer: (from: number, to: number) => (t: number) => (t < 0.5 ? from : to) })
  // 4. colour output
  const colour = createTransform(x, [0, 150, 300], ['#ff0000', '#00ff00', '#0000ff'])
  // 5. output map: several values from one input
  const { scale, rotate } = createTransform(x, [0, 300], { scale: [1, 2], rotate: [0, 180] })
  // 6. function of values (re-runs when a motion value or a signal it reads changes)
  const product = createTransform(() => x.get() * y.get() * factor())
  // 7. single transformer and array transformer
  const snapped = createTransform(x, (v: number) => Math.round(v / 50) * 50)
  const summed = createTransform([x, y], ([a, b]: number[]) => a + b)
  // 8. accessor ranges
  const flipped = createTransform(x, [0, 300], () => (flip() ? [100, 0] : [0, 100]))
  // createMotionTemplate: motion values, signal accessors and plain values
  const template = createMotionTemplate`translateX(${x}px) rotate(${rotate}deg) scale(${() => factor()}) ${'ok'}`
  const bg = createMotionTemplate`hsl(${eased} 80% 55%)`

  const xs = live(x)
  const rows: [string, () => unknown, string][] = [
    ['range [0,100,200]->[0,1,.2] clamp', live(clamped), 'x=250 gives 0.2'],
    ['same, clamp:false', live(unclamped), 'x=250 extrapolates'],
    ['ease: circIn', live(eased), 'eased 0..100'],
    ['ease: [cubicBezier, linear]', live(easedArray), '0..100..0'],
    ['mixer (step)', live(mixed), '0 until half way'],
    ['colour map', live(colour), 'rgba string'],
    ['fn x*y*factor (signal)', live(product), ''],
    ['single fn round(x/50)*50', live(snapped), ''],
    ['array fn x+y', live(summed), ''],
    ['accessor range (flip)', live(flipped), 'swaps with Flip'],
    ['template', live(template), ''],
  ]

  const slider = (label: string, min: number, max: number, step: number, onInput: (value: number) => void): JSX.Element => (
    <label>
      {label} <input type="range" min={min} max={max} step={step} value={0} aria-label={label} onInput={event => onInput(Number(event.currentTarget.value))} />
    </label>
  )

  return (
    <>
      <Controls>
        {slider('x', 0, 300, 1, v => x.set(v))}
        {slider('y', 0, 10, 1, v => y.set(v))}
        {slider('factor', 0, 4, 1, v => setFactor(v))}
        <label>
          <input type="checkbox" aria-label="flip" checked={flip()} onChange={event => setFlip(event.currentTarget.checked)} /> flip range
        </label>
        <Readout label="x" value={xs().toFixed(0)} />
      </Controls>
      <div class="controls" style={{ 'flex-direction': 'column', 'align-items': 'stretch' }}>
        {rows.map(([label, value, note]) => (
          <Readout label={`${label} ${note ? '(' + note + ')' : ''}`} value={fmt(value())} />
        ))}
      </div>
      <Stage height="140px">
        <motion.div class="box" data-testid="tf-box" style={{ x: eased, scale, rotate, background: colour, opacity: clamped }} />
        <motion.div class="box" data-testid="tf-bg" style={{ background: bg, marginLeft: '20px' }} />
      </Stage>
    </>
  )
}
