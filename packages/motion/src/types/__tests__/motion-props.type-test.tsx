// Compile-time assertions, checked by `pnpm typecheck` (not run by vitest).
import type { MotionValue } from 'motion-dom'
import type { MotionComponent, MotionProps } from '@/components/motion/types'
import type { MaybeAccessor } from '@/types'
import type { SVGAttributesWithMotionValues, MotionHTMLAttributes } from '@/types/motion-values'

declare const Motion: MotionComponent
declare const mv: MotionValue<number>

export const html = <Motion animate={{ x: 10 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} id="a" onClick={() => {}} fx>hi</Motion>
export const asTag = <Motion as="span" initial={false} style={{ x: mv }} ref={(el: HTMLSpanElement) => el}>hi</Motion>
export const svg = <Motion as="circle" r={mv} cx={10} animate={{ opacity: 0 }} />

// @ts-expect-error unknown prop on a div
export const bad = <Motion nonsense={1} />

export const props: MotionProps<'div'> = { layout: true, onPress: () => {}, forwardMotionProps: true }
export const maybe: MaybeAccessor<number> = () => 1
export type SvgKeys = keyof SVGAttributesWithMotionValues
export type DivAttrs = MotionHTMLAttributes<'div'>
