import { createMemo, createSignal, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, LayoutGroup, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-presence-advanced',
  title: 'AnimatePresence popLayout anchors, root, presenceAffectsLayout, propagate',
  group: 'reference',
  description: 'popLayout with anchorX / anchorY / root (where the exiting element is pinned and where its style element goes), presenceAffectsLayout (does a layout sibling animate after the exit), and propagate (nested presence exits with its parent).',
  covers: ['AnimatePresence', 'LayoutGroup', 'motion'],
} as const

const sizes: Record<number, [number, number]> = { 1: [110, 90], 2: [70, 60], 3: [70, 40] }

export default function Demo() {
  // ---- A: popLayout anchors / root
  const [anchorX, setAnchorX] = createSignal<'left' | 'right'>('left')
  const [anchorY, setAnchorY] = createSignal<'top' | 'bottom'>('top')
  const [rootKind, setRootKind] = createSignal<'head' | 'container'>('head')
  const [ids, setIds] = createSignal([1, 2, 3])
  const [popReport, setPopReport] = createSignal('(remove an item)')
  const [styleHome, setStyleHome] = createSignal('(none yet)')
  let container!: HTMLDivElement
  const popSettings = createMemo(() => ({ x: anchorX(), y: anchorY(), root: rootKind() }))

  const removeFirst = () => {
    const el = container.querySelector<HTMLElement>('[data-pid]')
    if (!el) return
    const before = el.getBoundingClientRect()
    const pid = el.dataset.pid
    setIds(list => list.filter(id => String(id) !== pid))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const gone = container.querySelector<HTMLElement>(`[data-pid="${pid}"]`)
      if (!gone) return setPopReport('exit already finished')
      const after = gone.getBoundingClientRect()
      setPopReport(`#${pid} position=${getComputedStyle(gone).position} dx=${Math.round(after.x - before.x)} dy=${Math.round(after.y - before.y)}`)
    }))
  }

  // ---- B: presenceAffectsLayout
  const [affects, setAffects] = createSignal(true)
  const [rows, setRows] = createSignal([1, 2, 3])
  const [sibY, setSibY] = createSignal('-')
  const [sibMoves, setSibMoves] = createSignal('-')
  let sibling!: HTMLDivElement
  const layoutSettings = createMemo(() => ({ affects: affects() }))
  const removeRow = () => {
    const y0 = sibling.getBoundingClientRect().y
    setRows(list => list.slice(1))
    // After the exit (0.4s) the sibling's layout either animates or jumps.
    const samples: number[] = []
    const t0 = performance.now()
    const tick = () => {
      const y = sibling.getBoundingClientRect().y
      if (performance.now() - t0 > 450) samples.push(Math.round(y))
      if (performance.now() - t0 < 1400) return requestAnimationFrame(tick)
      const distinct = new Set(samples).size
      setSibMoves(`${samples[0] - Math.round(y0)} -> ${samples.at(-1)! - Math.round(y0)} px, ${distinct} distinct y values after exit`)
    }
    requestAnimationFrame(tick)
  }

  // ---- C: propagate
  const [propagate, setPropagate] = createSignal(false)
  const [parentShown, setParentShown] = createSignal(true)
  const [parentExits, setParentExits] = createSignal(0)
  const [nestedExits, setNestedExits] = createSignal(0)
  const [childX, setChildX] = createSignal('-')
  const propSettings = createMemo(() => ({ propagate: propagate() }))
  const toggleParent = () => {
    if (parentShown()) {
      const t0 = performance.now()
      const tick = () => {
        const child = document.querySelector('[data-testid="nested-child"]')
        if (child) setChildX(`${new DOMMatrix(getComputedStyle(child).transform).m41.toFixed(0)}px @${Math.round(performance.now() - t0)}ms`)
        if (performance.now() - t0 < 500) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    setParentShown(v => !v)
  }

  onSettled(() => {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLStyleElement && node.sheet?.cssRules[0]?.cssText.includes('data-motion-pop-id'))
            setStyleHome(`<style> added to ${node.parentElement?.tagName.toLowerCase()}${node.parentElement?.dataset.testid ? `[${node.parentElement.dataset.testid}]` : ''}`)
        })
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  })

  return (
    <>
      <Controls>
        <b>popLayout</b>
        <label>anchorX <select value={anchorX()} onChange={e => setAnchorX(e.currentTarget.value as any)}><option>left</option><option>right</option></select></label>
        <label>anchorY <select value={anchorY()} onChange={e => setAnchorY(e.currentTarget.value as any)}><option>top</option><option>bottom</option></select></label>
        <label>root <select value={rootKind()} onChange={e => setRootKind(e.currentTarget.value as any)}><option>head</option><option>container</option></select></label>
        <Button onClick={removeFirst} disabled={ids().length === 0}>Remove first</Button>
        <Button onClick={() => setIds([1, 2, 3])}>Reset</Button>
      </Controls>
      <Controls>
        <Readout label="exiting element" value={popReport()} />
        <Readout label="pop style" value={styleHome()} />
      </Controls>
      <Stage height="150px" class="pop-stage">
        <div style={{ display: 'flex', width: '100%', height: '120px', 'align-items': 'flex-end' }}>
          <div ref={container} data-testid="pop-container" style={{ position: 'relative', display: 'flex', gap: '8px', 'align-items': 'flex-start', 'margin-left': 'auto', outline: '1px dashed var(--muted)' }}>
            <For each={[popSettings()]}>
              {cfg => (
                <AnimatePresence mode="popLayout" anchorX={cfg.x} anchorY={cfg.y} root={cfg.root === 'container' ? container : undefined}>
                  <For each={ids()}>
                    {id => (
                      <motion.div
                        class="box"
                        data-pid={id}
                        layout
                        style={{ width: `${sizes[id][0]}px`, height: `${sizes[id][1]}px`, color: '#fff', padding: '4px' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0.25 }}
                        transition={{ duration: 1.2 }}
                      >#{id}</motion.div>
                    )}
                  </For>
                </AnimatePresence>
              )}
            </For>
          </div>
        </div>
      </Stage>

      <Controls>
        <b>presenceAffectsLayout</b>
        <label><input type="checkbox" checked={affects()} onChange={e => setAffects(e.currentTarget.checked)} /> presenceAffectsLayout</label>
        <Button onClick={removeRow} disabled={rows().length === 0}>Remove first row</Button>
        <Button onClick={() => setRows([1, 2, 3])}>Reset</Button>
        <Readout label="layout sibling moved" value={sibMoves()} />
        <Readout label="sibling y" value={sibY()} />
      </Controls>
      <Stage height="190px">
        <For each={[layoutSettings()]}>
          {cfg => (
            <LayoutGroup>
              <div style={{ width: '240px' }}>
                <AnimatePresence presenceAffectsLayout={cfg.affects}>
                  <For each={rows()}>
                    {id => <motion.div layout class="box" style={{ height: '30px', width: '100%', marginBottom: '4px', color: '#fff', borderRadius: '6px' }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>row {id}</motion.div>}
                  </For>
                </AnimatePresence>
                <motion.div ref={sibling} layout data-testid="layout-sibling" style={{ height: '30px', background: 'var(--info)', color: '#fff', borderRadius: '6px' }} transition={{ duration: 0.6 }}>layout sibling</motion.div>
              </div>
            </LayoutGroup>
          )}
        </For>
      </Stage>

      <Controls>
        <b>propagate</b>
        <label><input type="checkbox" checked={propagate()} onChange={e => setPropagate(e.currentTarget.checked)} /> propagate (nested presence)</label>
        <Button onClick={toggleParent}>{parentShown() ? 'Hide parent' : 'Show parent'}</Button>
        <Readout label="parent onExitComplete" value={parentExits()} />
        <Readout label="nested onExitComplete" value={nestedExits()} ok={propagate() ? nestedExits() > 0 : undefined} />
        <Readout label="nested child x during parent exit" value={childX()} />
      </Controls>
      <Stage height="130px">
        <For each={[propSettings()]}>
          {cfg => (
            <AnimatePresence onExitComplete={() => setParentExits(n => n + 1)}>
              <Show when={parentShown()}>
                <motion.div class="box" style={{ width: '220px', height: '90px', color: '#fff', padding: '6px' }} exit={{ opacity: 0.3 }} transition={{ duration: 0.8 }}>
                  parent
                  <AnimatePresence propagate={cfg.propagate} onExitComplete={() => setNestedExits(n => n + 1)}>
                    <motion.div data-testid="nested-child" style={{ background: 'var(--info)', height: '30px', width: '100px', borderRadius: '6px' }} exit={{ x: 100 }} transition={{ duration: 0.5, ease: 'linear' }}>nested</motion.div>
                  </AnimatePresence>
                </motion.div>
              </Show>
            </AnimatePresence>
          )}
        </For>
      </Stage>
    </>
  )
}
