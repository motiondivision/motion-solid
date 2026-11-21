import type { JSX } from '@solidjs/web'
import { createEffect, createMemo, createSignal } from 'solid-js'
import type { FeatureBundle } from '@/features/dom-animation'
import type { MotionBundle } from '@/state/motion-state'
import { LazyMotionContext } from './context'

export { LazyMotionContext, useLazyMotionContext } from './context'
export type { LazyMotionContextValue } from './context'

export type LazyMotionFeatures = FeatureBundle | Promise<FeatureBundle> | (() => Promise<FeatureBundle>)

export interface LazyMotionProps {
  /** A feature bundle, a promise of one, or a function returning a promise (for `import()`). */
  features: LazyMotionFeatures
  /** Warn (throw) when a full `motion` component is rendered below instead of `m`. */
  strict?: boolean
  children?: JSX.Element
}

function isBundle(features: LazyMotionFeatures): features is FeatureBundle {
  return typeof features === 'object' && features !== null && !(features instanceof Promise) && 'renderer' in features
}

/**
 * Supplies the renderer and features that `m` components run with. A bundle object
 * applies synchronously (so SSR and hydration render with it); a promise or loader
 * function applies when it resolves.
 */
export function LazyMotion(props: LazyMotionProps): JSX.Element {
  // Set from a promise callback, never from an owned scope.
  const [loaded, setLoaded] = createSignal<FeatureBundle | undefined>(undefined)

  createEffect(
    // Boxed: a compute that returns a Promise is awaited by Solid, which would hand
    // the apply phase the resolved bundle instead of the promise.
    () => ({ source: props.features }),
    ({ source }) => {
      if (isBundle(source))
        return
      let stale = false
      const promise = typeof source === 'function' ? source() : source
      promise.then((bundle) => {
        if (!stale)
          setLoaded(bundle)
      })
      // A newer `features` value must not be overwritten by an older promise.
      return () => {
        stale = true
      }
    },
  )

  const features = createMemo<MotionBundle>(() => {
    const source = props.features
    return isBundle(source) ? source : (loaded() ?? {})
  })

  return (
    <LazyMotionContext
      value={{
        features,
        get strict() {
          return Boolean(props.strict)
        },
      }}
    >
      {props.children}
    </LazyMotionContext>
  )
}
