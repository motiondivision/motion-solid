import type { JSX } from '@solidjs/web'
import { motion } from '@/components/motion'

function Cmp(_: { label: string }): JSX.Element { return null as any }
const MCmp = motion.create(Cmp)
let spanRef!: HTMLSpanElement

export const ok = [
  <motion.div ref={(el) => { el.id = 'x' }} />,
  <motion.input onFocus={e => e.currentTarget.value} />,
  <MCmp label="x" animate={{ opacity: 1 }} />,
]
export const bad = [
  // @ts-expect-error wrong element type
  <motion.div ref={spanRef} />,
  // @ts-expect-error unknown prop on a wrapped component
  <MCmp label="x" bogus={1} />,
]
