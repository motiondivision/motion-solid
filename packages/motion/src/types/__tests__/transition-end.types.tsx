import { motion } from '@/components/motion'
import type { MotionStyleProps, VariantType } from '@/types'

export const ok = [
  <motion.div animate={{ x: 1, transitionEnd: { display: 'none' } }} />,
  <motion.div initial={{ opacity: 0 }} exit={{ opacity: 0, transitionEnd: { x: 10 } }} />,
]
export const variant: VariantType = { opacity: 1, transitionEnd: { display: 'none' } }
// @ts-expect-error transitionEnd is not a style property
export const style: MotionStyleProps = { transitionEnd: { x: 1 } }
