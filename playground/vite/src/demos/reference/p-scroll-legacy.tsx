import { createSignal } from 'solid-js'
import { createElementScroll, createMotionValueEvent, createViewportScroll, motion } from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'p-scroll-legacy',
  title: 'Deprecated createElementScroll / createViewportScroll',
  group: 'reference',
  description:
    'The deprecated scroll wrappers still work. EXPECTED: the library logs two console warnings ("createElementScroll is deprecated...", "createViewportScroll is deprecated..."); they show up in the diagnostics panel and are the only entries allowed here.',
  covers: ['createElementScroll', 'createMotionValueEvent', 'createViewportScroll', 'motion'],
  expects: ['is deprecated'],
} as const

function live(value: MotionValue<number>) {
  const [latest, setLatest] = createSignal(value.get())
  createMotionValueEvent(value, 'change', next => setLatest(next))
  return latest
}

export default function Demo() {
  let pane!: HTMLDivElement
  const element = createElementScroll(() => pane)
  const viewport = createViewportScroll()
  const elementY = live(element.scrollYProgress)
  const viewportY = live(viewport.scrollY)

  return (
    <>
      <Controls>
        <Button onClick={() => pane.scrollTo({ top: 9999 })}>scroll pane to bottom</Button>
        <Button onClick={() => pane.scrollTo({ top: 0 })}>top</Button>
        <Readout label="element scrollYProgress" value={elementY().toFixed(3)} />
        <Readout label="viewport scrollY" value={viewportY().toFixed(0)} />
      </Controls>
      <div
        ref={pane}
        data-testid="legacy-pane"
        style={{ position: 'relative', width: '260px', height: '160px', overflow: 'auto', border: '1px solid var(--border)', 'border-radius': '8px' }}
      >
        <div style={{ height: '600px', background: 'linear-gradient(var(--panel), var(--border))' }} />
      </div>
      <motion.div class="box" data-testid="legacy-bar" style={{ width: '260px', height: '8px', scaleX: element.scrollYProgress, transformOrigin: '0% 50%' }} />
      <div class="tall" />
    </>
  )
}
