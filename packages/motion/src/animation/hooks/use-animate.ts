import type { AnimationPlaybackControls, AnimationScope } from 'motion-dom'
import { createScopedAnimate } from 'framer-motion/dom'
import { onCleanup } from 'solid-js'
import { useMotionConfig } from '@/components/motion-config/context'
import { createReducedMotion } from './use-reduced-motion'

/**
 * A scope that doubles as a Solid `ref`: pass it as `<div ref={scope}>` and
 * `animate('selector', ...)` queries inside that element. `current` and
 * `animations` follow React's `AnimationScope` shape.
 */
export type AnimateScope<T extends Element = any> =
  ((element: T | null | undefined) => void)
  & Omit<AnimationScope<T>, 'current' | 'animations'>
  & { current: T, animations: AnimationPlaybackControls[] }

export type ScopedAnimate = ReturnType<typeof createScopedAnimate>

function createScope<T extends Element>(): AnimateScope<T> {
  let current: T | null = null
  const scope = ((element: T | null | undefined) => {
    current = element ?? null
  }) as AnimateScope<T>
  Object.defineProperty(scope, 'current', {
    get: () => current,
    set: (element: T | null) => {
      current = element
    },
    enumerable: true,
  })
  scope.animations = []
  return scope
}

/**
 * Creates a scope and a scoped `animate` function. Animations started with the
 * returned `animate` are stopped when the owner is disposed.
 *
 * ```tsx
 * const [scope, animate] = createAnimate()
 * onSettled(() => { animate('li', { opacity: 1 }) })
 * return <ul ref={scope}><li /></ul>
 * ```
 *
 * `MotionConfig`'s `skipAnimations` and `reducedMotion` are read each time
 * `animate` is called, so they apply to imperative animations too.
 */
export function createAnimate<T extends Element = any>(): [AnimateScope<T>, ScopedAnimate] {
  const scope = createScope<T>()
  const config = useMotionConfig()
  const prefersReducedMotion = createReducedMotion()

  const animate = ((...args: Parameters<ScopedAnimate>) => {
    const { reducedMotion, reduceMotion, skipAnimations } = config()
    const preference = reducedMotion ?? reduceMotion
    const shouldReduce = preference === 'always'
      ? true
      : preference === 'never' || preference === undefined
        ? undefined
        : prefersReducedMotion()
    scope.reduceMotion = shouldReduce
    scope.skipAnimations = skipAnimations
    return createScopedAnimate({
      scope: scope as unknown as AnimationScope<T>,
      reduceMotion: shouldReduce,
      skipAnimations,
    })(...args)
  }) as ScopedAnimate

  onCleanup(() => {
    scope.animations.forEach(animation => animation.stop())
    scope.animations.length = 0
  })

  return [scope, animate]
}
