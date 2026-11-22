import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-svg',
  title: 'SVG: pathLength, transforms, circle',
  group: 'reference',
  description: 'motion.svg / motion.path / motion.circle: pathLength draw-in, viewBox-aware transform origin rotate, and animated circle radius/fill.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [drawn, setDrawn] = createSignal(true)
  const [spin, setSpin] = createSignal(false)
  return (
    <>
      <Controls>
        <Button onClick={() => setDrawn(v => !v)}>Toggle pathLength</Button>
        <Button onClick={() => setSpin(v => !v)}>Toggle rotate / r</Button>
        <Readout label="pathLength target" value={drawn() ? '1' : '0'} />
      </Controls>
      <Stage height="300px">
        <motion.svg data-testid="svg" width="260" height="260" viewBox="0 0 100 100" style={{ background: 'var(--panel)', borderRadius: '8px' }}>
          <motion.path
            data-testid="svg-path"
            d="M10 80 C 30 10, 70 10, 90 80"
            fill="none"
            stroke="#6366f1"
            stroke-width="4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: drawn() ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
          <motion.circle
            data-testid="svg-circle"
            cx="50"
            cy="50"
            r="8"
            fill="#f59e0b"
            animate={{ r: spin() ? 16 : 8, fill: spin() ? '#22c55e' : '#f59e0b' }}
            transition={{ duration: 0.6 }}
          />
          <motion.rect
            data-testid="svg-rect"
            x="70"
            y="70"
            width="20"
            height="20"
            fill="#ec4899"
            style={{ originX: '50%', originY: '50%' }}
            animate={{ rotate: spin() ? 180 : 0, scale: spin() ? 1.5 : 1 }}
            transition={{ duration: 0.8 }}
          />
        </motion.svg>
      </Stage>
    </>
  )
}
