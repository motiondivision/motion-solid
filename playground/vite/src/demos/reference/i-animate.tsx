import { createSignal, For, onSettled, Show } from 'solid-js'
import { createAnimate, stagger } from 'motion-solid'
import type { AnimationPlaybackControls } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-animate',
  title: 'Imperative: createAnimate',
  group: 'reference',
  description: 'createAnimate scope + selector targets, a sequence, playback controls (pause/play/speed/stop) and owner-disposal cleanup.',
  covers: ['createAnimate', 'stagger'],
} as const

const dot = { width: '40px', height: '40px', background: 'var(--box)', 'border-radius': '50%', display: 'inline-block', margin: '4px' } as const

let lastCleanup: AnimationPlaybackControls | undefined

function Child(props: { onStarted: (c: AnimationPlaybackControls) => void }) {
  const [scope, animate] = createAnimate<HTMLDivElement>()
  onSettled(() => {
    props.onStarted(animate('.mover', { x: 200 }, { duration: 30 }))
  })
  return (
    <div ref={scope} style={{ height: '30px' }}>
      <div class="mover" style={{ width: '20px', height: '20px', background: '#a855f7' }} />
    </div>
  )
}

export default function Demo() {
  const [scope, animate] = createAnimate<HTMLDivElement>()
  const [controls, setControls] = createSignal<AnimationPlaybackControls | undefined>()
  const [state, setState] = createSignal('none')
  const [alive, setAlive] = createSignal(true)
  const [cleanupState, setCleanupState] = createSignal('-')

  const run = (c: AnimationPlaybackControls) => {
    setControls(() => c)
    setState('running')
    c.finished.then(() => setState('finished'), () => setState('cancelled'))
  }

  const selector = () => run(animate('.dot', { y: [0, -40, 0], backgroundColor: '#f59e0b' }, { delay: stagger(0.08), duration: 0.6 }))
  const sequence = () =>
    run(
      animate([
        ['.dot:nth-child(1)', { x: 120 }, { duration: 0.4 }],
        ['.dot:nth-child(2)', { x: 120 }, { duration: 0.4, at: '<' }],
        ['.dot:nth-child(3)', { x: 120 }, { duration: 0.4 }],
        ['.dot', { x: 0 }, { duration: 0.4, at: '+0.2' }],
      ]),
    )
  const slow = () => run(animate('.dot', { rotate: 360 }, { duration: 4 }))

  const unmountChild = () => {
    setAlive(false)
    queueMicrotask(() => setTimeout(() => setCleanupState(lastCleanup?.state ?? 'unknown'), 50))
  }

  return (
    <>
      <Controls>
        <Button onClick={selector}>Selector (stagger)</Button>
        <Button onClick={sequence}>Sequence</Button>
        <Button onClick={slow}>Slow rotate (4s)</Button>
        <Button onClick={() => controls()?.pause()}>pause</Button>
        <Button onClick={() => controls()?.play()}>play</Button>
        <Button onClick={() => { const c = controls(); if (c) c.speed = 3 }}>speed 3x</Button>
        <Button onClick={() => controls()?.stop()}>stop</Button>
        <Readout label="controls.state" value={controls()?.state ?? 'none'} />
        <Readout label="promise" value={state()} />
      </Controls>
      <Stage height="180px">
        <div ref={scope} data-testid="scope">
          <For each={[1, 2, 3, 4]}>{() => <div class="dot" style={dot} />}</For>
        </div>
      </Stage>
      <Controls>
        <Button disabled={!alive()} onClick={unmountChild}>Unmount child with a 30s animation</Button>
        <Readout label="child animation after dispose" value={cleanupState()} ok={cleanupState() === '-' ? undefined : cleanupState() !== 'running'} />
      </Controls>
      <Show when={alive()}>
        <Child onStarted={c => { lastCleanup = c }} />
      </Show>
    </>
  )
}
