import { For } from 'solid-js'
import { motion } from 'motion-solid'

const list = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } }

export function VariantsDemo() {
  return (
    <section>
      <h2>Variants</h2>
      <motion.ul class="reorder" variants={list} initial="hidden" animate="visible">
        <For each={['One', 'Two', 'Three', 'Four']}>
          {label => <motion.li variants={item}>{label}</motion.li>}
        </For>
      </motion.ul>
    </section>
  )
}
