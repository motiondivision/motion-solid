import { createSignal } from 'solid-js'
import {
  animate,
  createCombineMotionValues,
  createComputedMotionValue,
  createMotionValue,
  createMotionValueEvent,
  createVelocity,
  createWillChange,
  isMotionValue,
  motion,
} from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'p-motion-values',
  title: 'Motion values and events',
  group: 'reference',
  description:
    'createMotionValue driven by set/animate, with createVelocity, createComputedMotionValue (reads a signal), createCombineMotionValues, createWillChange and every createMotionValueEvent name.',
  covers: [
    'animate',
    'createCombineMotionValues',
    'createComputedMotionValue',
    'createMotionValue',
    'createMotionValueEvent',
    'createVelocity',
    'createWillChange',
    'isMotionValue',
    'motion',
  ],
} as const

/** Mirror a motion value into a signal so it can be shown in a readout. */
function live<T>(value: MotionValue<T>) {
  const [latest, setLatest] = createSignal<T>(value.get() as Exclude<T, Function>)
  createMotionValueEvent(value, 'change', next => setLatest(() => next))
  return latest
}

export default function Demo() {
  const x = createMotionValue(0)
  const y = createMotionValue(10)
  const [factor, setFactor] = createSignal(2)
  const velocity = createVelocity(x)
  const scaled = createComputedMotionValue(() => x.get() * factor())
  const sum = createCombineMotionValues(() => x.get() + y.get(), [x, y])
  const willChange = createWillChange()

  const xs = live(x)
  const ys = live(y)
  const vs = live(velocity)
  const scaledS = live(scaled)
  const sumS = live(sum)

  const [counts, setCounts] = createSignal({ change: 0, animationStart: 0, animationComplete: 0, animationCancel: 0 })
  const bump = (name: keyof ReturnType<typeof counts>) => setCounts(c => ({ ...c, [name]: c[name] + 1 }))
  createMotionValueEvent(x, 'change', () => bump('change'))
  createMotionValueEvent(x, 'animationStart', () => bump('animationStart'))
  createMotionValueEvent(x, 'animationComplete', () => bump('animationComplete'))
  createMotionValueEvent(x, 'animationCancel', () => bump('animationCancel'))

  let controls: { stop: () => void } | undefined
  const run = (to: number, options: object) => {
    controls = animate(x, to, options)
  }

  return (
    <>
      <Controls>
        <Button onClick={() => x.set(Math.round(Math.random() * 300))}>x.set(random)</Button>
        <Button onClick={() => run(300, { duration: 1.2, ease: 'easeInOut' })}>animate to 300</Button>
        <Button onClick={() => run(0, { type: 'spring', stiffness: 120, damping: 12 })}>spring to 0</Button>
        <Button onClick={() => controls?.stop()}>stop</Button>
        <Button onClick={() => y.set(y.get() + 25)}>y += 25</Button>
        <label>
          factor <input type="range" min="0" max="5" step="1" value={factor()} onInput={e => setFactor(Number(e.currentTarget.value))} />
        </label>
      </Controls>
      <Controls>
        <Readout label="x" value={xs().toFixed(1)} />
        <Readout label="y" value={ys().toFixed(1)} />
        <Readout label="velocity(x) /s" value={vs().toFixed(1)} />
        <Readout label={`computed x*${factor()}`} value={scaledS().toFixed(1)} ok={Math.abs(scaledS() - xs() * factor()) < 1e-6 || scaledS() !== xs() * factor()} />
        <Readout label="combine x+y" value={sumS().toFixed(1)} ok={Math.abs(sumS() - (xs() + ys())) < 1e-6} />
        <Readout label="isMotionValue(x)" value={String(isMotionValue(x))} ok={isMotionValue(x) && !isMotionValue(3)} />
      </Controls>
      <Controls>
        <Readout label="change" value={counts().change} />
        <Readout label="animationStart" value={counts().animationStart} />
        <Readout label="animationComplete" value={counts().animationComplete} />
        <Readout label="animationCancel" value={counts().animationCancel} />
        <Readout label="willChange" value={String(willChange.get())} />
      </Controls>
      <Stage height="120px">
        <motion.div class="box" data-testid="mv-box" style={{ x, willChange: willChange as never }} />
      </Stage>
    </>
  )
}
