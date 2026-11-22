import { createSignal, onSettled } from 'solid-js'
import { MotionGlobalConfig, animateValue, createRenderBatcher, frameData, frameSteps, processFrame, sampleDelta } from 'motion-solid'
import type { JSAnimation } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-frame-data',
  title: 'Frame loop internals: createRenderBatcher, frameSteps, processFrame',
  group: 'reference',
  description:
    'Start a private render batcher on a slow 200ms scheduler and watch its keep-alive step run. Switch Motion to a manual clock (useManualTiming) and drive an animation by hand with processFrame(); the global frameSteps and sampleDelta are listed.',
  covers: ['createRenderBatcher', 'frameSteps', 'processFrame', 'sampleDelta', 'MotionGlobalConfig', 'frameData', 'animateValue'],
} as const

export default function Demo() {
  // --- private batcher
  const batcher = createRenderBatcher(callback => { setTimeout(() => callback(performance.now()), 200) }, true)
  const [ticks, setTicks] = createSignal(0)
  const [delta, setDelta] = createSignal('0')
  const tick = (state: { delta: number }) => {
    setTicks(n => n + 1)
    setDelta(state.delta.toFixed(1))
  }
  const startBatcher = () => batcher.schedule.update(tick as never, true)
  const stopBatcher = () => batcher.cancel(tick as never)

  // --- manual clock
  const [manual, setManual] = createSignal(false)
  const [value, setValue] = createSignal(0)
  const [clock, setClock] = createSignal('0')
  let animation: JSAnimation<number> | undefined
  const enterManual = () => {
    MotionGlobalConfig.useManualTiming = true
    setManual(true)
    animation?.stop()
    animation = animateValue({ keyframes: [0, 100], duration: 1000, ease: 'linear', onUpdate: v => setValue(v) })
  }
  const leaveManual = () => {
    MotionGlobalConfig.useManualTiming = false
    setManual(false)
    animation?.stop()
  }
  const advance = (ms: number) => {
    processFrame(frameData.timestamp + ms)
    setClock(frameData.timestamp.toFixed(0))
  }
  onSettled(() => () => {
    batcher.cancel(tick as never)
    MotionGlobalConfig.useManualTiming = false
    animation?.stop()
  })

  return (
    <>
      <h4>Private batcher (200ms scheduler)</h4>
      <Controls>
        <Button onClick={startBatcher}>schedule.update (keep alive)</Button>
        <Button onClick={stopBatcher}>cancel</Button>
      </Controls>
      <Readout label="ticks" value={ticks()} />
      <Readout label="batcher.state.delta (ms)" value={delta()} />
      <Readout label="batcher.steps" value={Object.keys(batcher.steps).join(' > ')} />
      <h4>Global frame loop</h4>
      <Readout label="frameSteps" value={Object.keys(frameSteps).join(' > ')} />
      <Readout label="sampleDelta (ms)" value={sampleDelta} ok={sampleDelta === 10} />
      <h4>Manual clock</h4>
      <Controls>
        <Button pressed={manual()} onClick={enterManual}>useManualTiming + animateValue 0 to 100 over 1s</Button>
        <Button disabled={!manual()} onClick={() => advance(250)}>processFrame +250ms</Button>
        <Button disabled={!manual()} onClick={() => advance(1000)}>processFrame +1000ms</Button>
        <Button onClick={leaveManual}>back to real time</Button>
      </Controls>
      <Readout label="useManualTiming" value={String(manual())} />
      <Readout label="animation value" value={value().toFixed(1)} />
      <Readout label="frameData.timestamp" value={clock()} />
    </>
  )
}
