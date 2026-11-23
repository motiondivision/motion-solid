/**
 * Everything `framer-motion/dom` exports (motion-dom and motion-utils included), minus the
 * names that collide with solid-js / @solidjs/web. See `./dom.ts`.
 */
export * from './dom'
export { delay as delayInMs, resolveMotionValue, motionValue as createMotionValue } from 'motion-dom'
export type { FollowValueOptions } from 'motion-dom'
export * from './components'
export * from './components/context'
export * from './value'
export type * from './types'
export * from './animation'
export * from './utils'
export { createDragControls, DragControls } from './features/gestures/drag/use-drag-controls'
export type { PanInfo } from './features/gestures/pan/PanSession'
export { domAnimation, domMax, domMin } from '@/features'
export type { FeatureBundle } from '@/features/dom-animation'
export { isMotionComponent, unwrapMotionComponent, isValidMotionProp } from './components/motion/is-motion-component'
export { attachMotion, createAttachMotion, createPresetMotion, getMotionSSRStyle, makeMotion } from './directive'
export type { MotionRef, MotionRefFactory, MotionRefOptions } from './directive'
export { motionGlobalConfig } from './config'
export type { MotionCreateOptions, MotionNameSpace, MotionTagComponent } from './components/motion'

// React-named type aliases.
import type { MotionComponentProps as _MotionComponentProps } from './components/motion/types'
import type { CreateInViewOptions as _CreateInViewOptions } from './utils/use-in-view'
import type { CreateScrollOptions as _CreateScrollOptions, createScroll as _createScroll } from './value/use-scroll'
import type { CreateScopeMotionOptions as _CreateScopeMotionOptions } from './animation/hooks/use-scope-motion'

/** Props of a motion HTML element (React's `HTMLMotionProps`). */
export type HTMLMotionProps<T extends keyof HTMLElementTagNameMap = 'div'> = _MotionComponentProps<T>
/** Props of a motion SVG element (React's `SVGMotionProps`). */
export type SVGMotionProps<T extends keyof SVGElementTagNameMap = 'svg'> = _MotionComponentProps<T>
/** Options for `createInView` (React's `UseInViewOptions`). */
export type UseInViewOptions = _CreateInViewOptions
/** The MotionValues returned by `createScroll` (React's `ScrollMotionValues`). */
export type ScrollMotionValues = ReturnType<typeof _createScroll>
/** Options for `createScroll` (React's `UseScrollOptions`). */
export type UseScrollOptions = _CreateScrollOptions
/** Options for `createScopeMotion` (React's `UseScopeMotionOptions`). */
export type UseScopeMotionOptions = _CreateScopeMotionOptions
