import type { JSX } from '@solidjs/web'
import type { MotionValue } from 'motion-dom'
import type { AsTag, ComponentProps, ElementType, Options, SVGAttributesWithMotionValues, SetMotionValueType } from '@/types'
import type { PressEvent } from '@/features/gestures/press/types'
import type { InViewOptions } from '@/features/gestures/in-view/types'

/**
 * React-named aliases accepted by the public API. `resolveMotionProps` maps them
 * onto the internal (motion-vue) names: `whileTap` -> `whilePress`, `onTap*` ->
 * `onPress*`, `globalTapTarget` -> `globalPressTarget`, `viewport` -> `inViewOptions`.
 * The internal name wins when both are given.
 */
export interface MotionAliasProps {
  whileTap?: Options['whilePress']
  onTap?: PressEvent
  onTapStart?: PressEvent
  onTapCancel?: PressEvent
  globalTapTarget?: boolean
  viewport?: InViewOptions & { once?: boolean }
}

/**
 * Props every motion component accepts, on top of its element's own attributes.
 * There is no `asChild`: Solid has no slot cloning. Use `as` (tag or component)
 * and the `ref` prop instead.
 */
export interface MotionProps<T extends AsTag = 'div', K = any> extends Omit<Options<K>, 'motionConfig' | 'layoutGroup' | 'as'>, MotionAliasProps {
  /** Renders an `fx` marker attribute on the element (hook for fx stylesheets). */
  fx?: boolean
  as?: T
  forwardMotionProps?: boolean
  ignoreStrict?: boolean
  /** A set of MotionValues to animate (the React `values` prop). */
  values?: { [key: string]: MotionValue<number> | MotionValue<string> }
  /** Apply drag updates to these MotionValues instead of the element's own. */
  _dragX?: MotionValue<number>
  _dragY?: MotionValue<number>
}

type MotionOwnKeys = keyof Options<any> | keyof MotionAliasProps | 'fx' | 'as' | 'style'

/** Element attributes (SVG ones accept MotionValues) minus anything motion owns. */
export type MotionElementProps<T extends AsTag> = Omit<
  T extends ElementType
    ? SetMotionValueType<JSX.IntrinsicElements, keyof SVGAttributesWithMotionValues>[T]
    : ComponentProps<T>,
  MotionOwnKeys
>

export type MotionComponentProps<T extends AsTag = 'div', K = any> = MotionElementProps<T> & MotionProps<T, K> & {
  children?: JSX.Element
}
  // An element tag takes its `ref` type from the element's own attributes; only a wrapped component needs one.
  & (T extends ElementType ? unknown : { ref?: JSX.Ref<any> })

/** `motion.div`, `m.div`, `Motion`, ... */
export type MotionComponent = <T extends AsTag = 'div', K = any>(props: MotionComponentProps<T, K>) => JSX.Element
