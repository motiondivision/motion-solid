import type { JSX } from '@solidjs/web'
import { createEffect, createMemo } from 'solid-js'
import { warning } from 'motion-utils'
import type { MotionConfigProps, MotionConfigState } from './types'
import { MotionConfigContext, useMotionConfig } from './context'

/**
 * Sets default transition, reduced-motion, skipAnimations, nonce, inViewOptions,
 * transformPagePoint and isStatic
 * for every motion component below it. Anything a prop leaves unset is inherited
 * from the nearest outer `MotionConfig`.
 */
export function MotionConfig(props: MotionConfigProps & { children?: JSX.Element }): JSX.Element {
  const parentConfig = useMotionConfig()

  // Fixed after the first run, as in React: it changes how motion components are built.
  let isStatic: boolean | undefined
  let isStaticResolved = false

  const config = createMemo<MotionConfigState>(() => {
    const parent = parentConfig()
    const reducedMotion = props.reducedMotion ?? props.reduceMotion
    if (!isStaticResolved) {
      isStaticResolved = true
      isStatic = props.isStatic ?? parent.isStatic
    }
    return {
      transition: props.transition ?? parent.transition,
      reducedMotion: reducedMotion ?? parent.reducedMotion,
      skipAnimations: props.skipAnimations ?? parent.skipAnimations,
      nonce: props.nonce ?? parent.nonce,
      inViewOptions: props.inViewOptions ?? parent.inViewOptions,
      transformPagePoint: props.transformPagePoint ?? parent.transformPagePoint,
      isStatic,
    }
  })

  // Side effects stay out of the memo: warn from an effect, only when the deprecated prop
  // starts being the one in use (the compute value flips), not on every config recompute.
  createEffect(
    () => props.reducedMotion === undefined && props.reduceMotion !== undefined,
    (usesDeprecated) => {
      if (usesDeprecated)
        warning(false, '`reduceMotion` is deprecated. Use `reducedMotion` instead.')
    },
  )

  return <MotionConfigContext value={config}>{props.children}</MotionConfigContext>
}
