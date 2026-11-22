import { createSignal } from 'solid-js'
import { createMotionDirective, createPresetDirective, domMax, domMin, vMotion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-directive',
  title: 'Ref-factory directive',
  group: 'reference',
  description: 'vMotion on plain elements (static and reactive options), createMotionDirective with domMin and domMax, and createPresetDirective with per-use overrides.',
  covers: ['createMotionDirective', 'createPresetDirective', 'domMax', 'domMin', 'vMotion'],
} as const

const minimal = createMotionDirective(domMin)
const full = createMotionDirective(domMax, { transition: { duration: 0.6 } })
const fadeIn = createPresetDirective({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } })

const base = { width: '90px', height: '90px', 'border-radius': '12px', background: 'var(--box)', color: '#fff', padding: '6px', 'font-size': '12px' } as const

export default function Demo() {
  const [x, setX] = createSignal(0)
  const [hovered, setHovered] = createSignal(false)
  return (
    <>
      <Controls>
        <Button onClick={() => setX(v => (v === 0 ? 160 : 0))}>Toggle x (reactive vMotion)</Button>
        <Readout label="x state" value={x()} />
        <Readout label="domMin hover (should stay false)" value={String(hovered())} />
      </Controls>
      <Stage height="260px">
        <div data-testid="d-static" style={base} ref={vMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })}>vMotion static</div>
        <div data-testid="d-reactive" style={{ ...base, background: '#f59e0b' }} ref={vMotion(() => ({ animate: { x: x() } }))}>vMotion reactive</div>
        <div data-testid="d-min" style={{ ...base, background: '#14b8a6' }} ref={minimal({ animate: { rotate: 20 }, whileHover: { scale: 1.3 }, onHoverStart: () => setHovered(true) })}>domMin: animate only</div>
        <div data-testid="d-max" style={{ ...base, background: '#6366f1' }} ref={full({ whileHover: { scale: 1.3 }, drag: true, dragMomentum: false })}>domMax: hover + drag</div>
        <div data-testid="d-preset" style={{ ...base, background: '#ec4899' }} ref={fadeIn()}>preset</div>
        <div data-testid="d-preset-override" style={{ ...base, background: '#ef4444' }} ref={fadeIn({ transition: { duration: 1.5 }, animate: { opacity: 0.5, y: 0 } })}>preset + override</div>
      </Stage>
    </>
  )
}
