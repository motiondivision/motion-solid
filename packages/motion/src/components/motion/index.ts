import type { MotionComponent } from '@/components/motion/types'
import { createMotionComponentWithFeatures } from './utils'
import { domMax } from '@/features/dom-max'

export type { MotionProps } from './types'
export type { MotionCreateOptions, MotionNameSpace, MotionTagComponent } from './utils'
export { createMotionComponent, createMotionComponentWithFeatures } from './utils'

/** `motion.div`, `motion.svg`, `motion.create(Component)`: motion components with the full feature set. */
export const motion = createMotionComponentWithFeatures(domMax)
export const Motion = motion.create('div') as unknown as MotionComponent
