/**
 * Every prop the Motion component consumes itself. Used with Solid's `omit()` to
 * split motion props from the DOM props that are spread onto the element.
 *
 * Derived from motion-vue's runtime prop declaration (`MotionComponentProps`),
 * React's `validMotionProps` / `isValidMotionProp` (the `while*`, `drag*`, `layout*`,
 * `onTap*`, `onPan*`, `onLayout*` families plus the listed names), and the internal
 * option names (`whilePress`, `onPress*`, `inViewOptions`). React's names that map to
 * renamed internals (`whileTap`, `onTap*`, `globalTapTarget`, `viewport`) are included
 * so they never leak to the DOM.
 *
 * `style` is listed because the component merges it itself (initial style once, then
 * motion owns it). Intentionally absent: `asChild` (not supported in Solid), `ref`, `children`.
 */
export const motionPropKeys = [
  // component-level
  'fx',
  'as',
  'ignoreStrict',
  'forwardMotionProps',
  // animation
  'custom',
  'initial',
  'animate',
  'exit',
  'variants',
  'inherit',
  'style',
  'transformTemplate',
  'transition',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'values',
  '_dragX',
  '_dragY',
  // layout
  'layout',
  'layoutId',
  'layoutScroll',
  'layoutRoot',
  'layoutAnchor',
  'layoutDependency',
  'crossfade',
  'data-framer-portal-id',
  'onBeforeLayoutMeasure',
  'onLayoutMeasure',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  // press / tap
  'globalPressTarget',
  'globalTapTarget',
  'whilePress',
  'whileTap',
  'onPressStart',
  'onPress',
  'onPressCancel',
  'onTapStart',
  'onTap',
  'onTapCancel',
  // hover / focus
  'whileHover',
  'whileFocus',
  'onHoverStart',
  'onHoverEnd',
  // in view
  'whileInView',
  'inViewOptions',
  'viewport',
  'onViewportEnter',
  'onViewportLeave',
  // drag
  'drag',
  'whileDrag',
  'dragSnapToOrigin',
  'dragDirectionLock',
  'dragPropagation',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragTransition',
  'dragListener',
  'dragControls',
  'onDragStart',
  'onDragEnd',
  'onDrag',
  'onDirectionLock',
  'onDragTransitionEnd',
  'onMeasureDragConstraints',
  // pan
  'onPanSessionStart',
  'onPanStart',
  'onPan',
  'onPanEnd',
] as const

export type MotionPropKey = typeof motionPropKeys[number]

/** Lookup set of {@link motionPropKeys}. `draggable` is not in it: it stays a DOM attribute. */
export const motionPropSet: ReadonlySet<string> = new Set<string>(motionPropKeys)

/** True when `key` is a prop the Motion component consumes (not forwarded to the DOM). */
export function isMotionProp(key: string): boolean {
  return motionPropSet.has(key)
}

/**
 * Defaults motion-vue declared at the prop level. Solid props have no declaration
 * step, so the Motion component applies these with `merge()`.
 * `inherit` and `initial` stay undefined on purpose: `inherit === false` cuts the
 * variant tree, and `initial === undefined` falls back to the parent's value.
 */
export const motionPropDefaults = {
  forwardMotionProps: false,
  layout: false,
  layoutScroll: false,
  layoutRoot: false,
  crossfade: true,
  dragElastic: 0.5,
  dragMomentum: true,
  dragListener: true,
} as const
