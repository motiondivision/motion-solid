import { createSignal } from 'solid-js'
import {
  createFollowValue,
  createMotionValue,
  createMotionValueEvent,
  createSpring,
  motion,
} from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'p-spring-follow',
  title: 'createSpring + createFollowValue',
  group: 'reference',
  description:
    'Springs and tweens that follow a Solid signal (accessor source, accessor options) or another MotionValue, plus a colour spring. Change the target, stiffness/damping/mass or tween duration live; peak overshoot and a settled cue are shown.',
  covers: ['createFollowValue', 'createMotionValue', 'createMotionValueEvent', 'createSpring', 'motion'],
} as const

function live(value: MotionValue<number>) {
  const [latest, setLatest] = createSignal(value.get())
  createMotionValueEvent(value, 'change', next => setLatest(next))
  return latest
}

const COLOURS = ['#ef4444', '#22c55e', '#3b82f6']

export default function Demo() {
  const [target, setTarget] = createSignal(0)
  const [stiffness, setStiffness] = createSignal(200)
  const [damping, setDamping] = createSignal(12)
  const [mass, setMass] = createSignal(1)
  const [duration, setDuration] = createSignal(0.6)
  const [colourIndex, setColourIndex] = createSignal(0)
  const [peak, setPeak] = createSignal(0)

  // The raw motion value the "follow a MotionValue" variants chase.
  const raw = createMotionValue(0)
  const goto = (to: number) => {
    setTarget(to)
    raw.set(to)
    setPeak(0)
  }

  const signalSpring = createSpring(() => target(), () => ({ stiffness: stiffness(), damping: damping(), mass: mass() }))
  const mvSpring = createSpring(raw, { stiffness: 120, damping: 20 })
  const tween = createFollowValue(() => target(), () => ({ type: 'tween', duration: duration(), ease: 'easeInOut' }))
  const mvFollow = createFollowValue(raw, { type: 'spring', bounce: 0.6, duration: 0.8 })
  const colour = createSpring(() => COLOURS[colourIndex()], { stiffness: 80, damping: 15 })

  const spring = live(signalSpring)
  const tweened = live(tween)
  const mvSpringS = live(mvSpring)
  const mvFollowS = live(mvFollow)
  createMotionValueEvent(signalSpring, 'change', value => setPeak(p => (value > p ? value : p)))
  const [colourText, setColourText] = createSignal(colour.get())
  createMotionValueEvent(colour, 'change', value => setColourText(value))

  const settled = (value: number) => Math.abs(value - target()) < 0.5

  const slider = (label: string, min: number, max: number, step: number, value: number, onInput: (value: number) => void) => (
    <label>
      {label}{' '}
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={event => onInput(Number(event.currentTarget.value))} />
    </label>
  )

  const track = (testid: string, x: MotionValue<number>) => (
    <div style={{ position: 'relative', height: '34px', 'border-bottom': '1px dashed var(--border)' }}>
      <motion.div data-testid={testid} class="box" style={{ x, width: '28px', height: '28px', borderRadius: '50%' }} />
    </div>
  )

  return (
    <>
      <Controls>
        <Button onClick={() => goto(0)}>target 0</Button>
        <Button onClick={() => goto(150)}>target 150</Button>
        <Button onClick={() => goto(300)}>target 300</Button>
        <Button onClick={() => setColourIndex(i => (i + 1) % COLOURS.length)}>next colour</Button>
        {slider('target', 0, 300, 1, target(), goto)}
      </Controls>
      <Controls>
        {slider('stiffness', 20, 600, 10, stiffness(), setStiffness)}
        {slider('damping', 1, 60, 1, damping(), setDamping)}
        {slider('mass', 0.2, 5, 0.1, mass(), setMass)}
        {slider('duration', 0.1, 3, 0.1, duration(), setDuration)}
      </Controls>
      <Controls>
        <Readout label="target" value={target()} />
        <Readout label="spring(signal)" value={spring().toFixed(1)} ok={settled(spring())} />
        <Readout label="peak overshoot" value={Math.max(0, peak() - target()).toFixed(1)} />
        <Readout label="tween(signal)" value={tweened().toFixed(1)} ok={settled(tweened())} />
        <Readout label="spring(MotionValue)" value={mvSpringS().toFixed(1)} ok={settled(mvSpringS())} />
        <Readout label="follow spring(MV)" value={mvFollowS().toFixed(1)} ok={settled(mvFollowS())} />
        <Readout label="colour spring" value={colourText()} />
      </Controls>
      <Stage height="200px">
        {track('sf-spring', signalSpring)}
        {track('sf-tween', tween)}
        {track('sf-mv-spring', mvSpring)}
        {track('sf-mv-follow', mvFollow)}
        <motion.div data-testid="sf-colour" style={{ background: colour, width: '100%', height: '14px', borderRadius: '7px' }} />
      </Stage>
    </>
  )
}
