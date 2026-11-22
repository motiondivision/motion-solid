import { createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import { animate, createAnimate, createAnimationFrame, createMotionValue, createMotionValueEvent, stagger } from 'motion-solid'
import type { AnimationPlaybackControls } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'p-animate',
  title: 'animate(): elements, selectors, sequences, values, controls',
  group: 'reference',
  description:
    'The imperative animate() on an element, a CSS selector (with stagger), a sequence, a bare number range, a motion value and a plain object, with play/pause/seek/speed/stop/complete/cancel controls and live time/state readouts. createAnimate adds a scoped variant.',
  covers: ['animate', 'createAnimate', 'createAnimationFrame', 'createMotionValue', 'createMotionValueEvent', 'stagger'],
} as const

const DOTS = [0, 1, 2, 3, 4, 5, 6]
type From = 'first' | 'center' | 'last'

export default function Demo() {
  let box!: HTMLDivElement
  let controls: AnimationPlaybackControls | undefined
  const [info, setInfo] = createSignal({ time: 0, state: 'idle', speed: 1, duration: 0 })
  createAnimationFrame(() => {
    const c = controls
    if (c) setInfo({ time: c.time, state: c.state, speed: c.speed, duration: c.duration })
  })

  const start = () => {
    controls?.cancel()
    controls = animate(box, { x: [0, 240], rotate: [0, 180], backgroundColor: ['#6d28d9', '#f59e0b'] }, { duration: 2, ease: 'linear' })
  }

  // Selector + stagger
  const [staggerLog, setStaggerLog] = createSignal('')
  const wave = (from: From) => {
    const seen: string[] = []
    animate('.pa-dot', { y: [0, -36, 0] }, { duration: 0.5, delay: stagger(0.1, { from }) })
    setStaggerLog(`stagger(0.1, { from: '${from}' })${seen.length ? seen.join(',') : ''}`)
  }

  // Sequence
  const sequence = () => {
    animate([
      ['.pa-seq-a', { x: [0, 200] }, { duration: 0.5 }],
      ['.pa-seq-b', { x: [0, 200] }, { duration: 0.5, at: '-0.25' }],
      ['.pa-seq-c', { x: [0, 200] }, { duration: 0.5, at: '<' }],
    ])
  }

  // Bare values, motion value, plain object
  const [counter, setCounter] = createSignal(0)
  const mv = createMotionValue(0)
  const [mvText, setMvText] = createSignal(0)
  createMotionValueEvent(mv, 'change', next => setMvText(next))
  const target = { x: 0 }
  const [objectX, setObjectX] = createSignal(0)
  const values = () => {
    animate(0, 100, { duration: 1, ease: 'easeOut', onUpdate: latest => setCounter(latest) })
    animate(mv, mv.get() === 0 ? 300 : 0, { type: 'spring', stiffness: 100, damping: 10 })
    animate(target, { x: target.x === 0 ? 50 : 0 }, { duration: 1, onUpdate: () => setObjectX(target.x) })
  }

  // Scoped (selector resolves inside the scope only)
  const [scope, scopedAnimate] = createAnimate<HTMLDivElement>()
  const scoped = () => scopedAnimate('.pa-scoped', { scale: [1, 1.8, 1] }, { duration: 0.6 })

  return (
    <>
      <Controls>
        <Button onClick={start}>animate(el)</Button>
        <Button onClick={() => controls?.pause()}>pause</Button>
        <Button onClick={() => controls?.play()}>play</Button>
        <Button onClick={() => controls && (controls.time = 1)}>seek 1s</Button>
        <Button onClick={() => controls && (controls.speed = 0.25)}>speed .25</Button>
        <Button onClick={() => controls && (controls.speed = 2)}>speed 2</Button>
        <Button onClick={() => controls?.stop()}>stop</Button>
        <Button onClick={() => controls?.complete()}>complete</Button>
        <Button onClick={() => controls?.cancel()}>cancel</Button>
      </Controls>
      <Controls>
        <Readout label="time (s)" value={info().time.toFixed(2)} />
        <Readout label="duration (s)" value={info().duration.toFixed(2)} />
        <Readout label="speed" value={info().speed} />
        <Readout label="state" value={info().state} />
      </Controls>
      <Stage height="90px">
        <div ref={box} data-testid="pa-box" class="box" style={{ width: '60px', height: '60px' }} />
      </Stage>
      <Controls>
        <For each={['first', 'center', 'last'] as From[]}>{from => <Button onClick={() => wave(from)}>stagger from {from}</Button>}</For>
        <Button onClick={sequence}>sequence</Button>
        <Button onClick={values}>values (number, motion value, object)</Button>
        <Button onClick={scoped}>createAnimate scoped</Button>
        <Readout label="stagger" value={staggerLog() || 'none'} />
      </Controls>
      <Stage height="190px">
        <div style={{ display: 'flex', gap: '12px', 'padding-top': '40px', width: '100%' }}>
          <For each={DOTS}>{index => <div class="pa-dot" data-index={index} style={{ width: '24px', height: '24px', 'border-radius': '50%', background: 'var(--info)' }} />}</For>
        </div>
        <div style={{ width: '100%' }}>
          <div class="pa-seq-a box" style={{ width: '30px', height: '14px', 'margin-bottom': '4px' }} />
          <div class="pa-seq-b box" style={{ width: '30px', height: '14px', 'margin-bottom': '4px' }} />
          <div class="pa-seq-c box" style={{ width: '30px', height: '14px' }} />
        </div>
      </Stage>
      <Controls>
        <Readout label="animate(0,100) onUpdate" value={counter().toFixed(1)} />
        <Readout label="animate(motionValue)" value={mvText().toFixed(1)} />
        <Readout label="animate(object)" value={objectX().toFixed(1)} />
        <div ref={scope} data-testid="pa-scope" style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
          <div class="pa-scoped" style={{ width: '24px', height: '24px', background: 'var(--ok)', 'border-radius': '6px' }} />
          <span>scoped target</span>
        </div>
      </Controls>
    </>
  )
}
