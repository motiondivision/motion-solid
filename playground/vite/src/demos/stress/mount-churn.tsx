import { createEffect, createSignal, flush, For, onSettled, Show } from 'solid-js'
import { motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'mount-churn',
  title: 'Mount churn (500 elements)',
  group: 'stress',
  description:
    'Mounts and unmounts 500 animating motion elements repeatedly, by hand or on an auto loop. Live counters must balance and the DOM must return to zero.',
  covers: ['motion'],
} as const

const N = 500
const ids = Array.from({ length: N }, (_, i) => i)

// Plain counters: bumped from lifecycle hooks and published to signals on a timer, so no signal is written during disposal.
const stats = { live: 0, mounted: 0, unmounted: 0 }

function Cell(props: { id: number }) {
  onSettled(() => {
    stats.live++
    stats.mounted++
    return () => {
      stats.live--
      stats.unmounted++
    }
  })
  return (
    <motion.i
      data-churn=""
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ background: `hsl(${(props.id * 7) % 360} 70% 55%)` }}
    />
  )
}

export default function Demo() {
  const [shown, setShown] = createSignal(false)
  const [auto, setAuto] = createSignal(false)
  const [period, setPeriod] = createSignal(250)
  const [cycles, setCycles] = createSignal(0)
  const [lastMs, setLastMs] = createSignal(0)
  const [maxMs, setMaxMs] = createSignal(0)
  const [sumMs, setSumMs] = createSignal(0)
  const [view, setView] = createSignal({ live: 0, mounted: 0, unmounted: 0, dom: 0, heap: 0 })
  let timings = 0

  const toggle = () => {
    const t0 = performance.now()
    flush(() => setShown(value => !value))
    const ms = performance.now() - t0
    timings++
    setLastMs(ms)
    setMaxMs(value => Math.max(value, ms))
    setSumMs(value => value + ms)
    if (!shown()) setCycles(value => value + 1)
  }

  const reset = () => {
    setCycles(0)
    setMaxMs(0)
    setSumMs(0)
    timings = 0
  }

  createEffect(
    () => (auto() ? period() : 0),
    ms => {
      if (!ms) return
      const id = setInterval(toggle, ms)
      return () => clearInterval(id)
    },
  )

  onSettled(() => {
    const id = setInterval(() => {
      const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0
      setView({ ...stats, dom: document.querySelectorAll('[data-churn]').length, heap })
    }, 100)
    return () => clearInterval(id)
  })

  const expectedLive = () => (shown() ? N : 0)
  const balanced = () => view().mounted - view().unmounted === view().live
  const domMatches = () => view().dom === view().live

  return (
    <>
      <Controls>
        <Button onClick={toggle}>{shown() ? 'Unmount 500' : 'Mount 500'}</Button>
        <Button pressed={auto()} onClick={() => setAuto(value => !value)}>
          Auto loop {auto() ? 'ON' : 'OFF'}
        </Button>
        <label>
          period {period()}ms
          <input type="range" min="40" max="1000" step="10" value={period()} onInput={e => setPeriod(+e.currentTarget.value)} />
        </label>
        <Button onClick={reset}>Reset timing</Button>
      </Controls>
      <Controls>
        <Readout label="state" value={shown() ? 'mounted' : 'unmounted'} />
        <Readout label="cycles" value={cycles()} />
        <Readout label="mounted total" value={view().mounted} />
        <Readout label="unmounted total" value={view().unmounted} />
        <Readout label="live (owners)" value={view().live} />
        <Readout label="DOM [data-churn]" value={view().dom} />
        <Readout label="last sync flush" value={lastMs().toFixed(1) + 'ms'} />
        <Readout label="avg / max" value={(timings ? sumMs() / timings : 0).toFixed(1) + ' / ' + maxMs().toFixed(1) + 'ms'} />
        <Readout label="JS heap" value={view().heap ? (view().heap / 1048576).toFixed(1) + 'MB' : 'n/a'} />
      </Controls>
      <Controls>
        <Readout label="mounted-unmounted == live" value={balanced() ? 'PASS' : 'FAIL'} ok={balanced()} />
        <Readout label="DOM == live" value={domMatches() ? 'PASS' : 'FAIL (in-flight exits or leak)'} ok={domMatches()} />
        <Readout
          label="live == expected when idle"
          value={auto() || view().live === expectedLive() ? 'PASS' : 'FAIL'}
          ok={auto() || view().live === expectedLive()}
        />
      </Controls>
      <Stage height="260px">
        <div class="churn-grid">
          <Show when={shown()}>
            <For each={ids}>{id => <Cell id={id} />}</For>
          </Show>
        </div>
        <style>{`.churn-grid{display:flex;flex-wrap:wrap;gap:3px;width:100%}.churn-grid i{display:block;width:14px;height:14px;border-radius:3px}`}</style>
      </Stage>
    </>
  )
}
