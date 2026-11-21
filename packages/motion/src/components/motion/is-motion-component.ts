import type { Component } from 'solid-js'
import { motionPropKeys } from './props'

/** Marks a component made by `motion.*` / `m.*` / `motion.create`, and holds what it wraps. */
export const motionComponentSymbol = Symbol.for('motionComponentSymbol')

/** Checks if a component is a `motion` component. */
export function isMotionComponent(component: unknown): boolean {
  return (
    component !== null
    && (typeof component === 'function' || typeof component === 'object')
    && motionComponentSymbol in (component as object)
  )
}

/**
 * Unwraps a `motion` component and returns either a string for `motion.div` or
 * the Solid component for `motion.create(Component)`.
 *
 * If the component is not a `motion` component it returns `undefined`.
 */
export function unwrapMotionComponent(component: unknown): Component<any> | string | undefined {
  if (isMotionComponent(component))
    return (component as any)[motionComponentSymbol]
  return undefined
}

const validMotionProps = new Set<string>(motionPropKeys)

/**
 * Check whether a prop name is a valid motion prop key (a prop `motion` components
 * consume themselves, rather than pass on to the element).
 */
export function isValidMotionProp(key: string): boolean {
  return (
    key.startsWith('while')
    || (key.startsWith('drag') && key !== 'draggable')
    || key.startsWith('layout')
    || key.startsWith('onTap')
    || key.startsWith('onPan')
    || key.startsWith('onLayout')
    || validMotionProps.has(key)
  )
}
