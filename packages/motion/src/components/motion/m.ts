import type { MotionComponent } from '@/components/motion/types'
import { createMotionComponentWithFeatures } from '@/components/motion/utils'

/** `m.div`, `m.svg`, ...: motion components with no features until `LazyMotion` provides them. */
export const m = createMotionComponentWithFeatures()
export const M = m.create('div') as unknown as MotionComponent
