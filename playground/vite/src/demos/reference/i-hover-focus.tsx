import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-hover-focus',
  title: 'Interaction: hover + focus',
  group: 'reference',
  description: 'whileHover with onHoverStart/onHoverEnd, and whileFocus on a focusable button and an input.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [starts, setStarts] = createSignal(0)
  const [ends, setEnds] = createSignal(0)
  const [hovering, setHovering] = createSignal(false)
  const [focused, setFocused] = createSignal(0)

  return (
    <>
      <Controls>
        <Readout label="hoverStart" value={starts()} />
        <Readout label="hoverEnd" value={ends()} />
        <Readout label="hovering" value={String(hovering())} ok={hovering()} />
        <Readout label="focus events" value={focused()} />
        <span>Hover the box; Tab to the button / input.</span>
      </Controls>
      <Stage height="220px">
        <motion.div
          class="box"
          data-testid="hover-box"
          whileHover={{ scale: 1.3, backgroundColor: '#f59e0b' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onHoverStart={() => { setStarts(n => n + 1); setHovering(true) }}
          onHoverEnd={() => { setEnds(n => n + 1); setHovering(false) }}
        />
        <motion.button
          class="btn"
          data-testid="focus-btn"
          whileFocus={{ scale: 1.2, outlineColor: '#22c55e' }}
          onFocus={() => setFocused(n => n + 1)}
        >
          Focus me
        </motion.button>
        <motion.input
          data-testid="focus-input"
          placeholder="whileFocus input"
          style={{ padding: '8px', borderRadius: '6px' }}
          whileFocus={{ scale: 1.15, backgroundColor: '#fef9c3', color: '#000' }}
          onFocus={() => setFocused(n => n + 1)}
        />
      </Stage>
    </>
  )
}
