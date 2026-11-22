import { Show, createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import {
  cancelFrame,
  cancelMicrotask,
  cancelSync,
  createAnimationFrame,
  createPageInView,
  createTime,
  delayInMs,
  delayInSeconds,
  frame,
  frameData,
  microtask,
  sync,
  time,
} from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'p-frameloop',
  title: 'Frameloop: createTime, createAnimationFrame, frame, delay',
  group: 'reference',
  description:
    'createTime and createAnimationFrame with cleanup on unmount, frame step order (all 8 steps), frameData, cancelFrame, the sync/cancelSync aliases, microtask/cancelMicrotask, delayInMs/delayInSeconds (and cancelling them), time.now and createPageInView.',
  covers: [
    'cancelFrame',
    'cancelMicrotask',
    'cancelSync',
    'createAnimationFrame',
    'createPageInView',
    'createTime',
    'delayInMs',
    'delayInSeconds',
    'frame',
    'frameData',
    'microtask',
    'sync',
    'time',
  ],
} as const

const STEPS = ['setup', 'read', 'resolveKeyframes', 'preUpdate', 'update', 'preRender', 'render', 'postRender'] as const

function Clock(props: { onTime: (value: MotionValue<number>) => void }) {
  const elapsed = createTime()
  props.onTime(elapsed)
  const [shown, setShown] = createSignal(0)
  createAnimationFrame(() => setShown(elapsed.get()))
  return <Readout label="child createTime (ms)" value={shown().toFixed(0)} />
}

export default function Demo() {
  const [clockOn, setClockOn] = createSignal(true)
  let clock: MotionValue<number> | undefined
  const [polled, setPolled] = createSignal(0)
  const [unchanged, setUnchanged] = createSignal(0)
  const [frames, setFrames] = createSignal({ timestamp: 0, delta: 0, fps: 0, data: '' })
  const visible = createPageInView()

  let last = -1
  let window = 0
  let windowStart = 0
  createAnimationFrame((timestamp, delta) => {
    const now = clock?.get() ?? 0
    setUnchanged(now === last ? n => n + 1 : 0)
    last = now
    setPolled(now)
    window++
    if (timestamp - windowStart >= 500) {
      const fps = (window * 1000) / (timestamp - windowStart)
      window = 0
      windowStart = timestamp
      setFrames({ timestamp, delta, fps, data: `ts ${frameData.timestamp.toFixed(0)}, delta ${frameData.delta.toFixed(1)}, processing ${frameData.isProcessing}` })
    }
  })

  // Step order: schedule every step from outside the loop, record the order they run in.
  const [order, setOrder] = createSignal<string[]>([])
  const runOrder = () => {
    const seen: string[] = []
    // Scheduled in reverse so a correct loop, not call order, determines the result.
    for (const step of [...STEPS].reverse()) frame[step](() => seen.push(step))
    frame.postRender(() => setOrder(seen))
  }
  const orderOk = () => order().length === STEPS.length && order().every((step, index) => step === STEPS[index])

  // Cancelling: frame/cancelFrame, sync/cancelSync, microtask/cancelMicrotask, delayInMs/delayInSeconds.
  const [log, setLog] = createSignal<string[]>([])
  const say = (line: string) => setLog(lines => [...lines.slice(-7), line])
  const cancelTests = () => {
    const ran = () => say('frame.update ran (should NOT)')
    frame.update(ran)
    cancelFrame(ran)
    const syncRan = () => say('sync.update ran (should NOT)')
    sync.update(syncRan)
    cancelSync.update(syncRan)
    const microRan = () => say('microtask.read ran (should NOT)')
    microtask.read(microRan)
    cancelMicrotask(microRan)
    frame.update(() => say('frame.update (kept) ran'))
    sync.update(() => say('sync.update (kept) ran'))
    microtask.read(() => say('microtask.read (kept) ran'))
    frame.postRender(() => say('all cancels honoured if no "should NOT" line'))
  }
  const delays = () => {
    const start = time.now()
    delayInMs(() => say(`delayInMs(300) fired after ${(time.now() - start).toFixed(0)}ms`), 300)
    delayInSeconds(() => say(`delayInSeconds(0.6) fired after ${(time.now() - start).toFixed(0)}ms`), 0.6)
    const cancel = delayInMs(() => say('cancelled delay fired (should NOT)'), 200)
    cancel()
  }

  return (
    <>
      <Controls>
        <Button onClick={() => setClockOn(on => !on)} pressed={clockOn()}>{clockOn() ? 'Unmount clock' : 'Mount clock'}</Button>
        <Show when={clockOn()}>
          <Clock onTime={value => (clock = value)} />
        </Show>
        <Readout label="clock.get() (polled)" value={polled().toFixed(0)} />
        <Readout label="frames unchanged" value={unchanged()} ok={clockOn() ? unchanged() < 3 : unchanged() > 10} />
      </Controls>
      <Controls>
        <Readout label="createAnimationFrame fps" value={frames().fps.toFixed(0)} ok={frames().fps > 20} />
        <Readout label="delta ms" value={frames().delta.toFixed(1)} />
        <Readout label="frameData" value={frames().data} />
        <Readout label="time.now()" value={time.now().toFixed(0)} />
        <Readout label="createPageInView" value={String(visible())} ok={visible()} />
      </Controls>
      <Controls>
        <Button onClick={runOrder}>Run step order</Button>
        <Readout label="order" value={order().join(' > ') || 'not run'} ok={order().length ? orderOk() : undefined} />
      </Controls>
      <Controls>
        <Button onClick={cancelTests}>Cancel tests</Button>
        <Button onClick={delays}>Delays</Button>
        <Button onClick={() => setLog([])}>Clear log</Button>
      </Controls>
      <ul data-testid="log" style={{ 'font-family': 'monospace', 'font-size': '13px', 'min-height': '140px' }}>
        <For each={log()}>{line => <li>{line}</li>}</For>
      </ul>
    </>
  )
}
