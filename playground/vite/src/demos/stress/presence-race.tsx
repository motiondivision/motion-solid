import { createEffect, createSignal, flush, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'presence-race',
  title: 'AnimatePresence race',
  group: 'stress',
  description:
    'Rapidly adds, removes and replaces AnimatePresence children while exits are in flight, in sync, wait and popLayout modes. Requested vs DOM-observed counts must agree once idle.',
  covers: ['AnimatePresence', 'motion'],
} as const

type Mode = 'sync' | 'wait' | 'popLayout'
const MODES: Mode[] = ['sync', 'wait', 'popLayout']

function Race(props: { mode: Mode }) {
  const [items, setItems] = createSignal<number[]>([])
  const [burst, setBurst] = createSignal(false)
  const [period, setPeriod] = createSignal(70)
  const [view, setView] = createSignal({ domAdded: 0, domRemoved: 0, present: 0, idleMs: 0 })
  const [exitComplete, setExitComplete] = createSignal(0)
  let nextId = 1
  let requestedAdds = 0
  let requestedRemoves = 0
  let domAdded = 0
  let domRemoved = 0
  let lastOp = performance.now()
  let stage: HTMLDivElement | undefined
  const [requested, setRequested] = createSignal({ adds: 0, removes: 0 })

  const publishRequested = () => setRequested({ adds: requestedAdds, removes: requestedRemoves })

  // In wait mode only the first child is considered, so the list is capped at one item: add == replace.
  const add = () => {
    const wait = props.mode === 'wait'
    if (wait && items().length) {
      requestedRemoves += items().length
      setItems([])
    }
    setItems(list => [...list, nextId++])
    requestedAdds++
    lastOp = performance.now()
    publishRequested()
  }
  const removeAt = (index: number) => {
    const list = items()
    if (!list.length) return
    requestedRemoves++
    setItems(list.filter((_, i) => i !== index))
    lastOp = performance.now()
    publishRequested()
  }
  const randomOp = () => {
    const n = items().length
    const r = Math.random()
    if (n === 0 || (r < 0.55 && n < 6)) add()
    else removeAt(Math.floor(Math.random() * n))
    flush()
  }

  onSettled(() => {
    const isItem = (n: Node): n is HTMLElement => n instanceof HTMLElement && n.hasAttribute('data-item')
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(n => isItem(n) && domAdded++)
        record.removedNodes.forEach(n => isItem(n) && domRemoved++)
      }
    })
    observer.observe(stage!, { childList: true, subtree: true })
    const timer = setInterval(() => {
      observer.takeRecords().forEach(record => {
        record.addedNodes.forEach(n => isItem(n) && domAdded++)
        record.removedNodes.forEach(n => isItem(n) && domRemoved++)
      })
      setView({
        domAdded,
        domRemoved,
        present: stage!.querySelectorAll('[data-item]').length,
        idleMs: performance.now() - lastOp,
      })
    }, 100)
    return () => {
      observer.disconnect()
      clearInterval(timer)
    }
  })

  createEffect(
    () => (burst() ? period() : 0),
    ms => {
      if (!ms) return
      const id = setInterval(randomOp, ms)
      return () => clearInterval(id)
    },
  )

  const idle = () => !burst() && view().idleMs > 1200
  const check = (ok: boolean) => (idle() ? (ok ? 'PASS' : 'FAIL') : 'waiting for idle')
  const okOrPending = (ok: boolean) => (idle() ? ok : undefined)

  return (
    <>
      <Controls>
        <Button onClick={() => { add(); flush() }}>Add</Button>
        <Button onClick={() => { removeAt(items().length - 1); flush() }}>Remove last</Button>
        <Button onClick={() => { removeAt(0); flush() }}>Remove first</Button>
        <Button onClick={() => { while (items().length) removeAt(0); add(); flush() }}>Replace all</Button>
        <Button pressed={burst()} onClick={() => setBurst(value => !value)}>
          Random burst {burst() ? 'ON' : 'OFF'}
        </Button>
        <label>
          every {period()}ms
          <input type="range" min="20" max="400" step="10" value={period()} onInput={e => setPeriod(+e.currentTarget.value)} />
        </label>
      </Controls>
      <Controls>
        <Readout label="state items" value={items().length} />
        <Readout label="requested adds" value={requested().adds} />
        <Readout label="requested removes" value={requested().removes} />
        <Readout label="DOM added" value={view().domAdded} />
        <Readout label="DOM removed (exited)" value={view().domRemoved} />
        <Readout label="DOM present" value={view().present} />
        <Readout label="exiting now" value={Math.max(0, view().present - items().length)} />
        <Readout label="onExitComplete" value={exitComplete()} />
      </Controls>
      <Controls>
        <Readout label="adds == DOM added" value={check(requested().adds === view().domAdded)} ok={okOrPending(requested().adds === view().domAdded)} />
        <Readout label="removes == DOM removed" value={check(requested().removes === view().domRemoved)} ok={okOrPending(requested().removes === view().domRemoved)} />
        <Readout label="DOM present == state" value={check(view().present === items().length)} ok={okOrPending(view().present === items().length)} />
        <Readout
          label="exit callback fired"
          value={check(requested().removes === 0 || exitComplete() > 0)}
          ok={okOrPending(requested().removes === 0 || exitComplete() > 0)}
        />
      </Controls>
      <Stage height="150px">
        <div ref={stage} class="race-stage">
          <AnimatePresence mode={props.mode} onExitComplete={() => setExitComplete(value => value + 1)}>
            <For each={items()}>
              {id => (
                <motion.div
                  class="race-item"
                  data-item={id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  {id}
                </motion.div>
              )}
            </For>
          </AnimatePresence>
        </div>
        <style>{`.race-stage{display:flex;gap:8px;position:relative;min-height:60px;width:100%}.race-item{width:56px;height:56px;border-radius:10px;background:var(--box);color:#fff;display:grid;place-items:center;font-weight:600}`}</style>
      </Stage>
    </>
  )
}

export default function Demo() {
  const [mode, setMode] = createSignal<Mode>('sync')
  return (
    <>
      <Controls>
        <span>mode (changing it remounts the section and resets counters):</span>
        <For each={MODES}>
          {m => (
            <Button pressed={mode() === m} onClick={() => setMode(m)}>
              {m}
            </Button>
          )}
        </For>
      </Controls>
      <Show when={mode()} keyed>
        {m => <Race mode={m} />}
      </Show>
    </>
  )
}
