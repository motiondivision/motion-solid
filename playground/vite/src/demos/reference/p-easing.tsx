import { createMemo, createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import {
  anticipate,
  animate,
  backIn,
  backInOut,
  backOut,
  calcGeneratorDuration,
  circIn,
  circInOut,
  circOut,
  cubicBezier,
  cubicBezierAsString,
  easeIn,
  easeInOut,
  easeOut,
  generateLinearEasing,
  mirrorEasing,
  reverseEasing,
  spring,
  steps,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'p-easing',
  title: 'Easing gallery: curves, cubicBezier, steps, spring',
  group: 'reference',
  description:
    'Plots every easing function (ease*, circ*, back*, anticipate, mirrorEasing, reverseEasing, steps, a tunable cubicBezier) and the spring generator, with f(0)/f(.5)/f(1) readouts and a pass cue. Click a card, then Play to run animate() with that easing and watch the ball.',
  covers: [
    'animate',
    'anticipate',
    'backIn',
    'backInOut',
    'backOut',
    'calcGeneratorDuration',
    'circIn',
    'circInOut',
    'circOut',
    'cubicBezier',
    'cubicBezierAsString',
    'easeIn',
    'easeInOut',
    'easeOut',
    'generateLinearEasing',
    'mirrorEasing',
    'reverseEasing',
    'spring',
    'steps',
  ],
} as const

type Ease = (t: number) => number

const SIZE = 100
const PLOT_MIN = -0.5
const PLOT_MAX = 1.5
const px = (t: number) => t * SIZE
const py = (value: number) => SIZE - ((value - PLOT_MIN) / (PLOT_MAX - PLOT_MIN)) * SIZE

function path(fn: Ease, samples = 80) {
  let d = ''
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    d += `${i ? 'L' : 'M'}${px(t).toFixed(2)},${py(fn(t)).toFixed(2)}`
  }
  return d
}

export default function Demo() {
  const [x1, setX1] = createSignal(0.4)
  const [y1, setY1] = createSignal(0)
  const [x2, setX2] = createSignal(0.2)
  const [y2, setY2] = createSignal(1.4)
  const [stepCount, setStepCount] = createSignal(5)
  const [stiffness, setStiffness] = createSignal(120)
  const [damping, setDamping] = createSignal(10)
  const [selected, setSelected] = createSignal('easeInOut')
  const [ballX, setBallX] = createSignal(0)
  let ball!: HTMLDivElement

  // Spring: sampled through a fresh generator per curve (generators are stateful once done).
  const springDuration = createMemo(() => calcGeneratorDuration(spring({ keyframes: [0, 1], stiffness: stiffness(), damping: damping() })) || 1000)
  const springFn = createMemo<Ease>(() => {
    const options = { keyframes: [0, 1], stiffness: stiffness(), damping: damping() }
    const total = springDuration()
    return t => spring(options).next(t * total).value
  })

  const entries = createMemo<{ name: string; fn: Ease; end?: number }[]>(() => [
    { name: 'easeIn', fn: easeIn },
    { name: 'easeOut', fn: easeOut },
    { name: 'easeInOut', fn: easeInOut },
    { name: 'circIn', fn: circIn },
    { name: 'circOut', fn: circOut },
    { name: 'circInOut', fn: circInOut },
    { name: 'backIn', fn: backIn },
    { name: 'backOut', fn: backOut },
    { name: 'backInOut', fn: backInOut },
    { name: 'anticipate', fn: anticipate },
    { name: 'mirrorEasing(circIn)', fn: mirrorEasing(circIn) },
    { name: 'reverseEasing(circIn)', fn: reverseEasing(circIn) },
    { name: `steps(${stepCount()})`, fn: steps(stepCount()), end: 1 - 1 / stepCount() },
    { name: `steps(${stepCount()}, 'start')`, fn: steps(stepCount(), 'start') },
    { name: 'cubicBezier (sliders)', fn: cubicBezier(x1(), y1(), x2(), y2()) },
    { name: 'spring (sliders)', fn: springFn() },
  ])

  const current = createMemo(() => entries().find(entry => entry.name === selected()) ?? entries()[0])
  const cssString = createMemo(() => cubicBezierAsString([x1(), y1(), x2(), y2()]))
  const linearString = createMemo(() => generateLinearEasing(current().fn, 300, 6))

  const play = () => {
    const entry = current()
    animate(ball, { x: [0, 260] }, entry.name.startsWith('spring') ? { type: 'spring', stiffness: stiffness(), damping: damping() } : { duration: 1.5, ease: entry.fn })
  }

  const slider = (label: string, min: number, max: number, step: number, value: number, onInput: (value: number) => void) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={event => onInput(Number(event.currentTarget.value))} />
    </label>
  )

  return (
    <>
      <Controls>
        {slider('x1', 0, 1, 0.05, x1(), setX1)}
        {slider('y1', -1, 2, 0.05, y1(), setY1)}
        {slider('x2', 0, 1, 0.05, x2(), setX2)}
        {slider('y2', -1, 2, 0.05, y2(), setY2)}
        {slider('steps', 1, 12, 1, stepCount(), setStepCount)}
        {slider('stiffness', 20, 400, 10, stiffness(), setStiffness)}
        {slider('damping', 1, 40, 1, damping(), setDamping)}
      </Controls>
      <Controls>
        <Readout label="cubicBezierAsString" value={cssString()} />
        <Readout label="spring duration (ms)" value={springDuration().toFixed(0)} />
        <Readout label="selected" value={selected()} />
        <Button onClick={play}>Play selected</Button>
        <Readout label="linear() css (first 60 chars)" value={linearString().slice(0, 60)} />
      </Controls>
      <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' }}>
        <For each={entries()}>
          {entry => {
            const ok = () => Math.abs(entry.fn(0)) < 0.02 && Math.abs(entry.fn(1) - (entry.end ?? 1)) < 0.02
            return (
              <button
                type="button"
                class="btn"
                data-testid={`ease-${entry.name}`}
                data-ok={ok() ? 'true' : 'false'}
                aria-pressed={selected() === entry.name ? 'true' : 'false'}
                onClick={() => setSelected(entry.name)}
                style={{ background: selected() === entry.name ? 'var(--info)' : 'var(--panel)', color: selected() === entry.name ? '#fff' : 'inherit', border: '1px solid var(--border)', padding: '6px', 'text-align': 'left' }}
              >
                <div style={{ 'font-size': '12px' }}>{entry.name}</div>
                <svg viewBox={`-4 -4 ${SIZE + 8} ${SIZE + 8}`} width="100" height="100" style={{ background: '#fff', 'border-radius': '4px' }}>
                  <line x1="0" y1={py(0)} x2={SIZE} y2={py(0)} stroke="#cbd5e1" stroke-width="0.5" />
                  <line x1="0" y1={py(1)} x2={SIZE} y2={py(1)} stroke="#cbd5e1" stroke-width="0.5" />
                  <path d={path(entry.fn)} fill="none" stroke={ok() ? '#16a34a' : '#dc2626'} stroke-width="2" />
                </svg>
                <div style={{ 'font-family': 'monospace', 'font-size': '11px' }}>
                  f(0)={entry.fn(0).toFixed(2)} f(.5)={entry.fn(0.5).toFixed(2)} f(1)={entry.fn(1).toFixed(2)}
                </div>
              </button>
            )
          }}
        </For>
      </div>
      <Stage height="60px">
        <div ref={ball} data-testid="ease-ball" class="box" style={{ width: '30px', height: '30px', 'border-radius': '50%' }} />
      </Stage>
    </>
  )
}
