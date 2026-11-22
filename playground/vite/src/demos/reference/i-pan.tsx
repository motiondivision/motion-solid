import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import type { PanInfo } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-pan',
  title: 'Interaction: pan',
  group: 'reference',
  description: 'onPanSessionStart, onPanStart, onPan and onPanEnd with PanInfo point/delta/offset/velocity.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [counts, setCounts] = createSignal({ session: 0, start: 0, pan: 0, end: 0 })
  const [info, setInfo] = createSignal<PanInfo | undefined>()
  const bump = (key: 'session' | 'start' | 'pan' | 'end') => setCounts(c => ({ ...c, [key]: c[key] + 1 }))

  return (
    <>
      <Controls>
        <Readout label="sessionStart" value={counts().session} />
        <Readout label="panStart" value={counts().start} />
        <Readout label="pan" value={counts().pan} />
        <Readout label="panEnd" value={counts().end} />
        <Readout label="offset" value={info() ? `${info()!.offset.x.toFixed(0)}, ${info()!.offset.y.toFixed(0)}` : '-'} />
        <Readout label="velocity" value={info() ? `${info()!.velocity.x.toFixed(0)}, ${info()!.velocity.y.toFixed(0)}` : '-'} />
      </Controls>
      <Stage height="260px">
        <motion.div
          data-testid="pan-area"
          style={{ width: '100%', height: '200px', background: 'var(--border)', borderRadius: '12px', touchAction: 'none' }}
          onPanSessionStart={() => bump('session')}
          onPanStart={(_event, panInfo) => { bump('start'); setInfo(panInfo) }}
          onPan={(_event, panInfo) => { bump('pan'); setInfo(panInfo) }}
          onPanEnd={(_event, panInfo) => { bump('end'); setInfo(panInfo) }}
        >
          Pan (press and drag) anywhere in here. Nothing moves; pan only reports.
        </motion.div>
      </Stage>
    </>
  )
}
