import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'

export function BasicDemo() {
  const [moved, setMoved] = createSignal(false)

  return (
    <section>
      <h2>Basic animate</h2>
      <div class="row">
        <motion.div
          class="box"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, x: moved() ? 200 : 0, rotate: moved() ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />
        <button class="btn" onClick={() => setMoved(value => !value)}>Toggle</button>
      </div>
    </section>
  )
}
