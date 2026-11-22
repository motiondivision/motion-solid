import { For } from 'solid-js'
import { motion } from 'motion-solid'
import { Stage } from '../../ui'

export const meta = {
  id: 'variants',
  title: 'Variants',
  group: 'reference',
  description: 'Parent variants propagate to children with staggerChildren. Use Remount to replay.',
  covers: ['motion'],
} as const

const list = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } }

export default function Demo() {
  return (
    <Stage>
      <motion.ul class="reorder" variants={list} initial="hidden" animate="visible">
        <For each={['One', 'Two', 'Three', 'Four']}>
          {label => <motion.li variants={item}>{label}</motion.li>}
        </For>
      </motion.ul>
    </Stage>
  )
}
