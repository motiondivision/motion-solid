import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'

export function GesturesDemo() {
  const [taps, setTaps] = createSignal(0)

  return (
    <section>
      <h2>Gestures</h2>
      <div class="row">
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
          drag
          dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
          whileDrag={{ scale: 1.2, backgroundColor: '#22c55e' }}
        />
      </div>
    </section>
  )
}
