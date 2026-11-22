import { createMemo, createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import { ScrollOffset, createDomRef, createMotionValueEvent, createScroll, motion } from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'p-scroll',
  title: 'createScroll: container, target, axis, offset',
  group: 'reference',
  description:
    'Every createScroll value (scrollX/Y, progress, length) for a vertical container, a horizontal container (axis: x), a target card with a switchable reactive offset (ScrollOffset presets or edge strings) and the window; elements come from createDomRef.',
  covers: ['ScrollOffset', 'createDomRef', 'createMotionValueEvent', 'createScroll', 'motion'],
} as const

function live(value: MotionValue<number>) {
  const [latest, setLatest] = createSignal(value.get())
  createMotionValueEvent(value, 'change', next => setLatest(next))
  return latest
}

type Offsets = ReturnType<typeof createScroll>

function useReadouts(values: Offsets) {
  return {
    scrollX: live(values.scrollX),
    scrollY: live(values.scrollY),
    scrollXProgress: live(values.scrollXProgress),
    scrollYProgress: live(values.scrollYProgress),
    scrollXLength: live(values.scrollXLength),
    scrollYLength: live(values.scrollYLength),
  }
}

const OFFSETS = {
  'start end -> end start': ['start end', 'end start'],
  'ScrollOffset.Enter': ScrollOffset.Enter,
  'ScrollOffset.Exit': ScrollOffset.Exit,
  'ScrollOffset.Any': ScrollOffset.Any,
  'ScrollOffset.All': ScrollOffset.All,
} as const

const pane = { width: '260px', height: '180px', overflow: 'auto', position: 'relative' as const, border: '1px solid var(--border)', 'border-radius': '8px', background: 'var(--panel)' }

export default function Demo() {
  // Vertical container with a target card inside it.
  const [vPane, vPaneRef] = createDomRef<HTMLDivElement>()
  const [card, cardRef] = createDomRef<HTMLDivElement>()
  const [offsetName, setOffsetName] = createSignal<keyof typeof OFFSETS>('start end -> end start')
  const vertical = createScroll(() => ({ container: vPane }))
  const targeted = createScroll(() => ({ container: vPane, target: card, offset: OFFSETS[offsetName()] as never }))
  // Horizontal container.
  const [hPane, hPaneRef] = createDomRef<HTMLDivElement>()
  const horizontal = createScroll(() => ({ container: hPane, axis: 'x' }))
  // The window.
  const page = createScroll()

  const v = useReadouts(vertical)
  const t = useReadouts(targeted)
  const h = useReadouts(horizontal)
  const w = useReadouts(page)

  const vOk = createMemo(() => v.scrollYLength() > 0 && Math.abs(v.scrollYProgress() - v.scrollY() / v.scrollYLength()) < 0.01)
  const hOk = createMemo(() => h.scrollXLength() > 0 && Math.abs(h.scrollXProgress() - h.scrollX() / h.scrollXLength()) < 0.01)
  const to = (el: HTMLElement | undefined, left: number, top: number) => el?.scrollTo({ left, top })

  return (
    <>
      <Controls>
        <strong>Vertical container</strong>
        <Button onClick={() => to(vPane(), 0, 0)}>top</Button>
        <Button onClick={() => to(vPane(), 0, 300)}>middle</Button>
        <Button onClick={() => to(vPane(), 0, 9999)}>bottom</Button>
        <Readout label="scrollY" value={v.scrollY().toFixed(0)} />
        <Readout label="scrollYLength" value={v.scrollYLength().toFixed(0)} />
        <Readout label="scrollYProgress" value={v.scrollYProgress().toFixed(3)} ok={vOk()} />
        <Readout label="scrollX / XProgress / XLength" value={`${v.scrollX().toFixed(0)} / ${v.scrollXProgress().toFixed(2)} / ${v.scrollXLength().toFixed(0)}`} />
      </Controls>
      <Controls>
        <strong>Target card</strong>
        <select aria-label="offset" onChange={event => setOffsetName(event.currentTarget.value as keyof typeof OFFSETS)}>
          <For each={Object.keys(OFFSETS)}>{name => <option value={name}>{name}</option>}</For>
        </select>
        <Readout label="target scrollYProgress" value={t.scrollYProgress().toFixed(3)} />
        <Readout label="target scrollY" value={t.scrollY().toFixed(0)} />
      </Controls>
      <div style={{ display: 'flex', gap: '16px', 'flex-wrap': 'wrap' }}>
        <div ref={vPaneRef} data-testid="v-pane" style={pane}>
          <div style={{ height: '800px', position: 'relative', background: 'linear-gradient(var(--panel), var(--border))' }}>
            <div ref={cardRef} data-testid="card" style={{ position: 'absolute', top: '340px', left: '20px', right: '20px', height: '90px', background: 'var(--info)', 'border-radius': '8px', color: '#fff', padding: '8px' }}>
              target card
            </div>
          </div>
        </div>
        <div ref={hPaneRef} data-testid="h-pane" style={{ ...pane, height: '90px' }}>
          <div style={{ width: '1000px', height: '60px', background: 'linear-gradient(90deg, var(--panel), var(--info))' }} />
        </div>
      </div>
      <Controls>
        <strong>Horizontal container (axis x)</strong>
        <Button onClick={() => to(hPane(), 0, 0)}>left</Button>
        <Button onClick={() => to(hPane(), 9999, 0)}>right</Button>
        <Readout label="scrollX" value={h.scrollX().toFixed(0)} />
        <Readout label="scrollXLength" value={h.scrollXLength().toFixed(0)} />
        <Readout label="scrollXProgress" value={h.scrollXProgress().toFixed(3)} ok={hOk()} />
      </Controls>
      <motion.div class="box" data-testid="h-bar" style={{ width: '260px', height: '8px', scaleX: horizontal.scrollXProgress, transformOrigin: '0% 50%' }} />
      <Controls>
        <strong>Window</strong>
        <Readout label="window scrollY" value={w.scrollY().toFixed(0)} />
        <Readout label="window scrollYLength" value={w.scrollYLength().toFixed(0)} />
        <Readout label="window scrollYProgress" value={w.scrollYProgress().toFixed(3)} />
      </Controls>
      <div class="tall" />
    </>
  )
}
