import { createSignal } from 'solid-js'
import { createMotionValue, createMotionValueEvent, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-drag-options',
  title: 'Interaction: drag options',
  group: 'reference',
  description: 'drag axis, object constraints, dragElastic, dragMomentum, dragTransition, dragSnapToOrigin, dragDirectionLock, whileDrag and the onDrag* callbacks with live x/y.',
  covers: ['createMotionValue', 'createMotionValueEvent', 'motion'],
} as const

type Axis = true | 'x' | 'y'

export default function Demo() {
  const x = createMotionValue(0)
  const y = createMotionValue(0)
  const [xText, setXText] = createSignal('0')
  const [yText, setYText] = createSignal('0')
  createMotionValueEvent(x, 'change', v => setXText(v.toFixed(0)))
  createMotionValueEvent(y, 'change', v => setYText(v.toFixed(0)))

  const [axis, setAxis] = createSignal<Axis>(true)
  const [elastic, setElastic] = createSignal(0.3)
  const [momentum, setMomentum] = createSignal(true)
  const [snap, setSnap] = createSignal(false)
  const [lock, setLock] = createSignal(false)
  const [phase, setPhase] = createSignal('idle')
  const [lockAxis, setLockAxis] = createSignal('-')
  const [drags, setDrags] = createSignal(0)

  return (
    <>
      <Controls>
        <Button onClick={() => setAxis(a => (a === true ? 'x' : a === 'x' ? 'y' : true))}>axis: {String(axis())}</Button>
        <label>
          elastic {elastic().toFixed(2)}
          <input type="range" min="0" max="1" step="0.05" value={elastic()} onInput={e => setElastic(Number(e.currentTarget.value))} />
        </label>
        <Button pressed={momentum()} onClick={() => setMomentum(v => !v)}>momentum</Button>
        <Button pressed={snap()} onClick={() => setSnap(v => !v)}>snapToOrigin</Button>
        <Button pressed={lock()} onClick={() => setLock(v => !v)}>directionLock</Button>
        <Button onClick={() => { x.jump(0); y.jump(0) }}>Reset position</Button>
      </Controls>
      <Controls>
        <Readout label="x" value={xText()} />
        <Readout label="y" value={yText()} />
        <Readout label="phase" value={phase()} />
        <Readout label="onDrag calls" value={drags()} />
        <Readout label="locked axis" value={lockAxis()} />
        <span>Constraints: x within +-120, y within +-60.</span>
      </Controls>
      <Stage height="260px" class="drag-stage">
        <div style={{ margin: '0 auto', position: 'relative', left: '0' }}>
          <motion.div
            class="box"
            data-testid="drag-box"
            style={{ x, y, cursor: 'grab' }}
            drag={axis()}
            dragConstraints={{ left: -120, right: 120, top: -60, bottom: 60 }}
            dragElastic={elastic()}
            dragMomentum={momentum()}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20, power: 0.4 }}
            dragSnapToOrigin={snap()}
            dragDirectionLock={lock()}
            whileDrag={{ scale: 1.15, backgroundColor: '#22c55e' }}
            onDragStart={() => setPhase('dragging')}
            onDrag={() => setDrags(n => n + 1)}
            onDirectionLock={a => setLockAxis(a)}
            onDragEnd={() => setPhase('released')}
            onDragTransitionEnd={() => setPhase('settled')}
          />
        </div>
      </Stage>
    </>
  )
}
