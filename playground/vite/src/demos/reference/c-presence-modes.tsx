import { createMemo, createSignal, For, onSettled } from 'solid-js'
import { AnimatePresence, createPresenceData, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-presence-modes',
  title: 'AnimatePresence modes, custom, initial, as',
  group: 'reference',
  description: 'sync / wait / popLayout, custom data for exit variants (createPresenceData), onExitComplete, initial={false}, and the `as` wrapper element. Max simultaneous nodes proves wait mode never overlaps.',
  covers: ['AnimatePresence', 'motion', 'createPresenceData'],
} as const

type Mode = 'sync' | 'wait' | 'popLayout'

const variants = {
  hidden: { opacity: 0, y: -30 },
  shown: { opacity: 1, y: 0 },
  // `custom` is the direction handed down by AnimatePresence.
  leave: (dir: number) => ({ opacity: 0, x: dir * 80 }),
}

function Item(props: { id: number }) {
  const dir = createPresenceData<number>()
  return (
    <motion.div
      data-testid="item"
      class="box"
      style={{ width: '90px', height: '70px', color: '#fff', padding: '6px', fontSize: '12px', flexShrink: '0' }}
      variants={variants}
      initial="hidden"
      animate="shown"
      exit="leave"
      transition={{ duration: 0.5 }}
    >
      #{props.id}
      <div>custom={String(dir())}</div>
    </motion.div>
  )
}

export default function Demo() {
  const [mode, setMode] = createSignal<Mode>('sync')
  const [initial, setInitial] = createSignal(true)
  const [wrapper, setWrapper] = createSignal<'none' | 'div' | 'section'>('none')
  const [dir, setDir] = createSignal(1)
  const [ids, setIds] = createSignal([1, 2, 3])
  const [next, setNext] = createSignal(4)
  const [exits, setExits] = createSignal(0)
  const [nodes, setNodes] = createSignal(0)
  const [maxNodes, setMaxNodes] = createSignal(0)
  let stage!: HTMLDivElement

  // `initial` and `mode` are read when the presence mounts; a new settings object remounts it.
  const settings = createMemo(() => ({ mode: mode(), initial: initial(), wrapper: wrapper() }))

  const count = () => stage.querySelectorAll('[data-testid="item"]').length
  onSettled(() => {
    const observer = new MutationObserver(() => {
      const n = count()
      setNodes(n)
      setMaxNodes(m => Math.max(m, n))
    })
    observer.observe(stage, { childList: true, subtree: true })
    setNodes(count())
    setMaxNodes(count())
    return () => observer.disconnect()
  })
  const add = () => { setIds(list => [...list, next()]); setNext(n => n + 1) }
  const replaceAll = () => { setIds(list => list.map((_, i) => next() + i)); setNext(n => n + ids().length) }

  return (
    <>
      <Controls>
        <label>mode
          <select value={mode()} onChange={e => { setMaxNodes(0); setMode(e.currentTarget.value as Mode) }}>
            <option>sync</option><option>wait</option><option>popLayout</option>
          </select>
        </label>
        <label><input type="checkbox" checked={initial()} onChange={e => setInitial(e.currentTarget.checked)} /> initial</label>
        <label>as
          <select value={wrapper()} onChange={e => setWrapper(e.currentTarget.value as any)}>
            <option>none</option><option>div</option><option>section</option>
          </select>
        </label>
        <label><input type="checkbox" checked={dir() === -1} onChange={e => setDir(e.currentTarget.checked ? -1 : 1)} /> custom = -1 (exit left)</label>
      </Controls>
      <Controls>
        <Button onClick={add}>Add</Button>
        <Button onClick={() => setIds(list => list.slice(1))} disabled={ids().length === 0}>Remove first</Button>
        <Button onClick={() => setIds(list => list.slice(0, -1))} disabled={ids().length === 0}>Remove last</Button>
        <Button onClick={replaceAll}>Replace all</Button>
        <Button onClick={() => { setIds([1, 2, 3]); setNext(4) }}>Reset</Button>
        <Readout label="state ids" value={ids().join(',') || '(none)'} />
        <Readout label="onExitComplete" value={exits()} />
        <Readout label="items in DOM" value={nodes()} />
        <Readout label="max items in DOM" value={maxNodes()} ok={mode() === 'wait' ? maxNodes() <= 1 : undefined} />
      </Controls>
      <p style={{ margin: '0 0 8px', 'font-size': '12px' }}>wait mode renders only the first item (as React). popLayout pins the leaving item so siblings close the gap at once.</p>
      <Stage height="130px">
        <div ref={stage} style={{ display: 'contents' }}>
          <For each={[settings()]}>
            {cfg => (
              <div style={{ position: 'relative', display: 'flex', gap: '8px', 'min-width': '400px' }}>
                <AnimatePresence
                  mode={cfg.mode}
                  initial={cfg.initial}
                  as={cfg.wrapper === 'none' ? undefined : cfg.wrapper}
                  custom={dir()}
                  onExitComplete={() => setExits(n => n + 1)}
                >
                  <For each={ids()}>{id => <Item id={id} />}</For>
                </AnimatePresence>
              </div>
            )}
          </For>
        </div>
      </Stage>
    </>
  )
}
