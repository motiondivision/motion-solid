import { createSignal, Show } from 'solid-js'
import { LayoutGroup, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-layout',
  title: 'Layout: layout, layoutId, crossfade, layoutDependency, layoutScroll, layoutRoot',
  group: 'reference',
  description: 'Layout animation props: size/position changes, a shared layoutId swap with crossfade toggle, layoutDependency gating, and layout inside a scrolled container (layoutScroll) and a layoutRoot.',
  covers: ['LayoutGroup', 'motion'],
} as const

export default function Demo() {
  const [wide, setWide] = createSignal(false)
  const [noise, setNoise] = createSignal(0)
  const [which, setWhich] = createSignal<'a' | 'b'>('a')
  const [crossfade, setCrossfade] = createSignal(true)
  const [starts, setStarts] = createSignal(0)
  const [depStarts, setDepStarts] = createSignal(0)
  const [dep, setDep] = createSignal(0)

  return (
    <>
      <Controls>
        <Button onClick={() => setWide(v => !v)}>Toggle width (layout)</Button>
        <Readout label="layout animations started" value={starts()} />
        <Button onClick={() => setNoise(n => n + 1)}>Unrelated re-render ({noise()})</Button>
        <Button onClick={() => { setWide(v => !v); setDep(d => d + 1) }}>Toggle + bump layoutDependency</Button>
        <Readout label="dependency-gated starts" value={depStarts()} />
      </Controls>
      <Stage height="150px">
        <motion.div
          layout
          class="box"
          data-testid="layout-box"
          style={{ width: wide() ? '260px' : '100px' }}
          onLayoutAnimationStart={() => setStarts(n => n + 1)}
        />
        <motion.div
          layout
          layoutDependency={dep()}
          class="box"
          data-testid="dep-box"
          style={{ width: wide() ? '260px' : '100px', background: '#14b8a6' }}
          onLayoutAnimationStart={() => setDepStarts(n => n + 1)}
        />
      </Stage>
      <Controls>
        <Button onClick={() => setWhich(w => (w === 'a' ? 'b' : 'a'))}>Swap layoutId target ({which()})</Button>
        <Button pressed={crossfade()} onClick={() => setCrossfade(v => !v)}>crossfade: {String(crossfade())}</Button>
      </Controls>
      <Stage height="150px">
        <LayoutGroup>
          <div style={{ width: '140px', height: '110px', border: '1px solid var(--border)' }}>
            <Show when={which() === 'a'}>
              <motion.div layoutId="shared" crossfade={crossfade()} data-testid="shared-a" style={{ width: '100%', height: '100%', background: '#f97316', borderRadius: '16px' }} />
            </Show>
          </div>
          <div style={{ width: '220px', height: '110px', border: '1px solid var(--border)', 'margin-left': '40px' }}>
            <Show when={which() === 'b'}>
              <motion.div layoutId="shared" crossfade={crossfade()} data-testid="shared-b" style={{ width: '100%', height: '100%', background: '#8b5cf6', borderRadius: '4px' }} />
            </Show>
          </div>
        </LayoutGroup>
      </Stage>
      <Controls><span>layoutScroll (left) and layoutRoot (right): toggle the box in each after scrolling / inside a transformed ancestor.</span></Controls>
      <Stage height="220px">
        <ScrollCase />
        <RootCase />
      </Stage>
    </>
  )
}

function ScrollCase() {
  const [open, setOpen] = createSignal(false)
  return (
    <motion.div layoutScroll data-testid="scroll-case" style={{ width: '200px', height: '160px', overflow: 'auto', border: '1px solid var(--border)' }}>
      <div style={{ height: '120px' }}>scroll down</div>
      <motion.div layout class="box" data-testid="scroll-box" style={{ height: open() ? '140px' : '60px', width: '100px', background: '#ec4899' }} onClick={() => setOpen(v => !v)} />
      <div style={{ height: '200px' }} />
    </motion.div>
  )
}

function RootCase() {
  const [open, setOpen] = createSignal(false)
  return (
    <motion.div layoutRoot data-testid="root-case" style={{ width: '200px', height: '160px', border: '1px solid var(--border)', transform: 'translateY(10px)', padding: '10px' }}>
      <motion.div layout class="box" data-testid="root-box" style={{ width: open() ? '160px' : '60px', background: '#0ea5e9' }} onClick={() => setOpen(v => !v)} />
    </motion.div>
  )
}
