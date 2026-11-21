import { attachFollow, attachSpring, isMotionValue, motionValue } from 'motion-dom'
import type { AnyResolvedKeyframe, FollowValueOptions, MotionValue, SpringOptions } from 'motion-dom'
import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createRenderEffect } from 'solid-js'

export type CreateSpringOptions = SpringOptions & Pick<FollowValueOptions, 'skipInitialAnimation'>

type Attach<O> = (
  value: MotionValue<any>,
  target: MotionValue<any> | AnyResolvedKeyframe,
  options: O,
) => VoidFunction

/**
 * Shared by createSpring and createFollowValue. Creates the MotionValue (seeded from the
 * source) and attaches `attach` to it. The attachment is rebuilt, and the previous one
 * released, whenever the source or options accessor changes.
 */
function createFollow<O>(
  source: MaybeAccessor<AnyResolvedKeyframe | MotionValue<AnyResolvedKeyframe>>,
  options: MaybeAccessor<O>,
  attach: Attach<O>,
): MotionValue<any> {
  // Assigned by the render effect below, which runs synchronously on creation.
  let value!: MotionValue<any>
  let previousTarget: MotionValue<AnyResolvedKeyframe> | AnyResolvedKeyframe | undefined

  createRenderEffect(
    () => ({ target: access(source), options: access(options) }),
    ({ target, options }) => {
      const isFirstRun = !value
      if (isFirstRun)
        value = motionValue(isMotionValue(target) ? target.get() : target)

      const detach = attach(value, target, options)

      /**
       * A MotionValue source drives the value through its own `change` events. A plain value has
       * no events, so when an accessor hands over a new one, animate to it.
       */
      if (!isFirstRun && !isMotionValue(target) && target !== previousTarget)
        value.set(target)
      previousTarget = target

      return detach
    },
  )

  return value
}

/**
 * Creates a MotionValue that, when `set`, animates to its new state using any Motion transition
 * (spring, tween, inertia, keyframes). It either works stand-alone, initialised with a value, or
 * follows another MotionValue.
 *
 * `source` and `options` may be accessors, so a Solid signal can drive the target.
 *
 * ```ts
 * const x = createFollowValue(0, { type: 'tween', duration: 0.5 })
 * const y = createFollowValue(source, { type: 'spring', damping: 10 })
 * ```
 */
export function createFollowValue(source: MaybeAccessor<MotionValue<string> | string>, options?: MaybeAccessor<FollowValueOptions>): MotionValue<string>
export function createFollowValue(source: MaybeAccessor<MotionValue<number> | number>, options?: MaybeAccessor<FollowValueOptions>): MotionValue<number>
export function createFollowValue(
  source: MaybeAccessor<MotionValue<any> | AnyResolvedKeyframe>,
  options: MaybeAccessor<FollowValueOptions> = {},
): MotionValue<any> {
  return createFollow(source, options, attachFollow)
}

/**
 * Creates a MotionValue that, when `set`, uses a spring animation to reach its new state.
 *
 * It either works stand-alone, initialised with a value, or follows another MotionValue.
 * This drives a MotionValue with Motion's spring physics, so it composes with
 * `createTransform` and style bindings; it is not `@solid-primitives/spring`, which animates a
 * plain signal.
 *
 * ```ts
 * const x = createSpring(0, { stiffness: 300 })
 * const y = createSpring(x, { damping: 10 })
 * const z = createSpring(() => count(), { stiffness: 200 })   // follows a signal
 * ```
 *
 * @param source - A MotionValue, a value, or an accessor of either. The spring animates towards it
 *   whenever it changes.
 * @param options - Spring options, or an accessor of them.
 */
export function createSpring(source: MaybeAccessor<MotionValue<string> | string>, options?: MaybeAccessor<CreateSpringOptions>): MotionValue<string>
export function createSpring(source: MaybeAccessor<MotionValue<number> | number>, options?: MaybeAccessor<CreateSpringOptions>): MotionValue<number>
export function createSpring(
  source: MaybeAccessor<MotionValue<any> | AnyResolvedKeyframe>,
  options: MaybeAccessor<CreateSpringOptions> = {},
): MotionValue<any> {
  return createFollow(source, options, attachSpring)
}
