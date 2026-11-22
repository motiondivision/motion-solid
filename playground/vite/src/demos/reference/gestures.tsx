import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gestures',
  title: 'Gestures',
  group: 'reference',
  description: 'whileHover / whileTap / onTap on a button, and a constrained drag with whileDrag.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [taps, setTaps] = createSignal(0)

  return (
    <>
      <Controls>
        <Readout label="taps" value={taps()} />
        <span>Hover and press the button; drag the box within +-100 x / +-50 y.</span>
      </Controls>
      <Stage height="260px">
        <motion.button
          class="btn"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onTap={() => setTaps(count => count + 1)}
        >
          Tapped {taps()} times
        </motion.button>
        <motion.div
          class="box"
          data-testid="drag-box"
          drag
          dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
          whileDrag={{ scale: 1.2, backgroundColor: '#22c55e' }}
        />
      </Stage>
    </>
  )
}
