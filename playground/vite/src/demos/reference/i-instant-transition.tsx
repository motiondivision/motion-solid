import { createSignal } from 'solid-js'
import {
  createInstantLayoutTransition,
  createInstantTransition,
  createResetProjection,
  disableInstantTransitions,
  motion,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-instant-transition',
  title: 'Instant transitions + reset projection',
  group: 'reference',
  description: 'createInstantTransition and createInstantLayoutTransition skip animation for one update; disableInstantTransitions re-enables; createResetProjection re-measures the layout tree.',
  covers: ['createInstantLayoutTransition', 'createInstantTransition', 'createResetProjection', 'disableInstantTransitions', 'motion'],
} as const

export default function Demo() {
  const instant = createInstantTransition()
  const instantLayout = createInstantLayoutTransition()
  const resetProjection = createResetProjection()
  const [on, setOn] = createSignal(false)
  const [wide, setWide] = createSignal(false)
  const [lastMs, setLastMs] = createSignal('-')

  const timed = (change: () => void) => {
    const t0 = performance.now()
    change()
    setTimeout(() => setLastMs(`${(performance.now() - t0).toFixed(0)}ms`), 0)
  }

  return (
    <>
      <Controls>
        <Button onClick={() => setOn(v => !v)}>Animated toggle (slow tween)</Button>
        <Button onClick={() => instant(() => setOn(v => !v))}>Instant toggle</Button>
        <Button onClick={() => disableInstantTransitions()}>disableInstantTransitions()</Button>
        <Readout label="x" value={on() ? '300' : '0'} />
      </Controls>
      <Stage height="120px">
        <motion.div class="box" data-testid="inst-box" style={{ width: '60px', height: '60px' }} animate={{ x: on() ? 300 : 0 }} transition={{ duration: 1.5 }} />
      </Stage>
      <Controls>
        <Button onClick={() => setWide(v => !v)}>Layout toggle (animated)</Button>
        <Button onClick={() => instantLayout(() => setWide(v => !v))}>Instant layout toggle</Button>
        <Button onClick={() => timed(() => resetProjection())}>resetProjection()</Button>
        <Readout label="last reset" value={lastMs()} />
      </Controls>
      <Stage height="120px">
        <motion.div layout class="box" data-testid="inst-layout" style={{ width: wide() ? '300px' : '80px', height: '60px' }} transition={{ duration: 1.5 }} />
      </Stage>
    </>
  )
}
