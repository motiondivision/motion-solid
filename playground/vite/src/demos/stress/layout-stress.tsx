import { createEffect, createSignal, flush, For, onSettled } from 'solid-js'
import { LayoutGroup, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'layout-stress',
  title: 'Layout stress (200 items)',
  group: 'stress',
  description:
    '200 layout-animated items reshuffled continuously. Once the shuffling stops every item must sit in its grid slot with no leftover transform.',
  covers: ['LayoutGroup', 'motion'],
} as const

const N = 200
const COLS = 20
const shuffled = (list: number[]) => {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function Demo() {
  const [order, setOrder] = createSignal(Array.from({ length: N }, (_, i) => i))
  const [running, setRunning] = createSignal(false)
  const [period, setPeriod] = createSignal(600)
  const [shuffles, setShuffles] = createSignal(0)
  const [view, setView] = createSignal({ fps: 0, worst: 0, dom: 0, moving: 0, misplaced: 0 })
  let grid: HTMLDivElement | undefined

  const shuffle = () => {
    flush(() => setOrder(list => shuffled(list)))
    setShuffles(value => value + 1)
  }
  const sorted = () => flush(() => setOrder(Array.from({ length: N }, (_, i) => i)))

  createEffect(
    () => (running() ? period() : 0),
    ms => {
      if (!ms) return
      const id = setInterval(shuffle, ms)
      return () => clearInterval(id)
    },
  )

  onSettled(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let frames = 0
    let worst = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      acc += dt
      frames++
      worst = Math.max(worst, dt)
      if (acc >= 500) {
        const cells = Array.from(grid!.children) as HTMLElement[]
        const cellW = cells.length ? grid!.getBoundingClientRect().width / COLS : 0
        const origin = grid!.getBoundingClientRect()
        let moving = 0
        let misplaced = 0
        cells.forEach((cell, index) => {
          if (getComputedStyle(cell).transform !== 'none') moving++
          const rect = cell.getBoundingClientRect()
          const col = index % COLS
          const row = Math.floor(index / COLS)
          const dx = Math.abs(rect.left - origin.left - col * cellW)
          const dy = Math.abs(rect.top - origin.top - row * 32)
          if (dx > 4 || dy > 4) misplaced++
        })
        setView({ fps: (frames * 1000) / acc, worst, dom: cells.length, moving, misplaced })
        acc = 0
        frames = 0
        worst = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })

  const settled = () => !running() && view().moving === 0
  const slotOk = () => view().misplaced === 0
  return (
    <>
      <Controls>
        <Button onClick={shuffle}>Shuffle once</Button>
        <Button pressed={running()} onClick={() => setRunning(value => !value)}>
          Continuous {running() ? 'ON' : 'OFF'}
        </Button>
        <Button onClick={sorted}>Sort</Button>
        <label>
          every {period()}ms
          <input type="range" min="100" max="2000" step="50" value={period()} onInput={e => setPeriod(+e.currentTarget.value)} />
        </label>
      </Controls>
      <Controls>
        <Readout label="shuffles" value={shuffles()} />
        <Readout label="fps" value={view().fps.toFixed(0)} ok={view().fps >= 30} />
        <Readout label="worst frame" value={view().worst.toFixed(0) + 'ms'} />
        <Readout label="items in DOM" value={view().dom} ok={view().dom === N} />
        <Readout label="items mid-animation" value={view().moving} />
        <Readout label="items off their slot" value={view().misplaced} />
        <Readout label="settled when stopped" value={running() ? 'running' : settled() && slotOk() ? 'PASS' : 'waiting / FAIL'} ok={running() ? undefined : settled() && slotOk()} />
        <Readout label="DOM order == state" value={String(order().length === N)} />
      </Controls>
      <Stage height="260px">
        <LayoutGroup>
          <div ref={grid} class="ls-grid">
            <For each={order()}>
              {n => (
                <motion.div layout class="ls-item" data-n={n} transition={{ duration: 0.45 }} style={{ background: `hsl(${(n * 360) / N} 70% 55%)` }}>
                  {n}
                </motion.div>
              )}
            </For>
          </div>
        </LayoutGroup>
        <style>{`.ls-grid{display:grid;grid-template-columns:repeat(${COLS},1fr);grid-auto-rows:32px;width:100%}.ls-item{height:28px;margin:2px;border-radius:5px;color:#fff;font-size:10px;display:grid;place-items:center}`}</style>
      </Stage>
    </>
  )
}
