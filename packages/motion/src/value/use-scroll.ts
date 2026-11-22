import { cancelMicrotask, microtask, motionValue, supportsScrollTimeline, supportsViewTimeline } from 'motion-dom'
import type { AccelerateConfig, AnimationPlaybackControlsWithThen } from 'motion-dom'
import { scroll } from 'framer-motion/dom'
import { warning } from 'motion-utils'
import { access, isServer } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createEffect, createMemo, createRenderEffect } from 'solid-js'
import type { Accessor } from 'solid-js'
import type { ScrollInfoOptions } from '@/types'
import { createMounted } from '@/utils/use-dom-ref'
import { offsetToViewTimelineRange } from './scroll/offsets'

/**
 * An element for the `container` / `target` options: the element itself, or an accessor that
 * returns it. Use an accessor with Solid's `ref` pattern, either a signal
 * (`const [target, setTarget] = createSignal<HTMLElement>()` then `ref={setTarget}` and
 * `target`) or a variable assigned in `ref` (`() => el`). Accessors are resolved once the
 * component has mounted, and re-resolved when a signal they read changes.
 */
export type ScrollElement<T extends Element = HTMLElement> = T | null | undefined | Accessor<T | null | undefined>

export interface CreateScrollOptions extends Omit<ScrollInfoOptions, 'container' | 'target'> {
  container?: ScrollElement
  target?: ScrollElement<Element>
}

function createScrollMotionValues() {
  return {
    scrollX: motionValue(0),
    scrollY: motionValue(0),
    scrollXProgress: motionValue(0),
    scrollYProgress: motionValue(0),
    /**
     * The maximum scroll offset of each axis, so the distance from the end
     * of the container is `scrollYLength.get() - scrollY.get()`.
     */
    scrollXLength: motionValue(0),
    scrollYLength: motionValue(0),
  }
}

function resolveElement<T extends Element>(element: ScrollElement<T>): T | undefined {
  return access(element) ?? undefined
}

/**
 * An element was asked for (it is not `undefined`) but has not been resolved yet.
 */
function isPending<T extends Element>(requested: ScrollElement<T>, resolved: T | undefined) {
  return requested !== undefined && requested !== null && !resolved
}

function canAccelerateScroll(
  target: ScrollElement<Element>,
  offset: ScrollInfoOptions['offset'],
): boolean {
  if (isServer)
    return false
  return target !== undefined && target !== null
    ? supportsViewTimeline() && !!offsetToViewTimelineRange(offset)
    : supportsScrollTimeline() && !offset
}

function makeAccelerateConfig(
  axis: 'x' | 'y',
  options: MaybeAccessor<CreateScrollOptions>,
): AccelerateConfig {
  return {
    factory: (animation: AnimationPlaybackControlsWithThen) => {
      let cleanup: VoidFunction | undefined
      const start = () => {
        const { container, target, ...rest } = access(options)
        const resolvedContainer = resolveElement(container)
        const resolvedTarget = resolveElement(target)
        /**
         * A requested element can be hydrated by a ref assigned after createScroll. Don't attach
         * to the window scroll in the meantime: that result is cached and would permanently
         * mistrack. Wait until the elements resolve.
         */
        if (isPending(container, resolvedContainer) || isPending(target, resolvedTarget)) {
          microtask.read(start)
          return
        }
        cleanup = scroll(animation, {
          ...rest,
          axis,
          container: resolvedContainer,
          target: resolvedTarget,
        })
      }
      microtask.read(start)
      return () => {
        cancelMicrotask(start)
        cleanup?.()
      }
    },
    times: [0, 1],
    keyframes: [0, 1],
    ease: (v: number) => v,
    duration: 1,
  }
}

/**
 * Creates MotionValues that track the scroll position and progress of the window, a
 * `container`, or the visibility of a `target` within it.
 *
 * ```tsx
 * const { scrollYProgress } = createScroll()
 * <motion.div style={{ scaleX: scrollYProgress }} />
 *
 * let target!: HTMLDivElement
 * const { scrollYProgress } = createScroll(() => ({ target: () => target, offset: ['start end', 'end end'] }))
 * <div ref={target} />
 * ```
 *
 * `options` may be an accessor; the scroll listener is torn down and rebuilt when anything it
 * reads changes. `container` and `target` accept elements or element accessors (see
 * `ScrollElement`). Elements are resolved after mount; nothing is tracked on the server.
 */
export function createScroll(options: MaybeAccessor<CreateScrollOptions> = {}) {
  const values = createScrollMotionValues()

  /**
   * Set (or clear) the acceleration config once up front if the browser supports it. A render
   * effect runs synchronously, so the config is in place before createTransform and
   * the motion component read it. Only whether a target was requested matters here; the factory
   * resolves the elements when it is invoked.
   */
  createRenderEffect(
    () => {
      const { target, offset } = access(options)
      return canAccelerateScroll(target, offset)
    },
    (accelerate) => {
      values.scrollXProgress.accelerate = accelerate ? makeAccelerateConfig('x', options) : undefined
      values.scrollYProgress.accelerate = accelerate ? makeAccelerateConfig('y', options) : undefined
    },
  )

  // Plain accessors (`() => el` assigned in `ref`) are not reactive: resolve again after mount.
  // Memoised so that the effect only restarts when an element actually resolves differently.
  const mounted = createMounted()
  const resolvedContainer = createMemo(() => {
    mounted()
    return resolveElement(access(options).container)
  })
  const resolvedTarget = createMemo(() => {
    mounted()
    return resolveElement(access(options).target)
  })

  createEffect(
    () => {
      if (isServer)
        return undefined
      const { container, target, ...rest } = access(options)
      // Resolving here also tracks any signal the element accessors read, so the listener is
      // rebuilt when a signal-backed ref is assigned.
      return { rest, container, target, resolvedContainer: resolvedContainer(), resolvedTarget: resolvedTarget() }
    },
    (config) => {
      if (!config)
        return

      let cleanup: VoidFunction | undefined

      /**
       * Resolves the elements again and starts tracking if they are all available. The apply
       * phase runs after the component has mounted, so refs assigned during render are set by now.
       * A container/target that was requested but has not resolved must not be replaced by the
       * window: starting without it would track the wrong thing.
       */
      const tryStart = (isRetry: boolean) => {
        // The first attempt uses the elements resolved (tracked) in the compute phase; they are
        // resolved again after mount, which re-runs this effect. Only the microtask retry
        // re-resolves directly, for a ref assigned later than that.
        const container = isRetry ? resolveElement(config.container) : config.resolvedContainer
        const target = isRetry ? resolveElement(config.target) : config.resolvedTarget
        const containerPending = isPending(config.container, container)
        const targetPending = isPending(config.target, target)
        if (isRetry) {
          warning(!containerPending, 'Container ref is defined but not hydrated', 'use-scroll-ref')
          warning(!targetPending, 'Target ref is defined but not hydrated', 'use-scroll-ref')
        }
        if (containerPending || targetPending)
          return false

        cleanup = scroll(
          (_progress, { x, y }) => {
            values.scrollX.set(x.current)
            values.scrollXProgress.set(x.progress)
            values.scrollXLength.set(x.scrollLength)
            values.scrollY.set(y.current)
            values.scrollYProgress.set(y.progress)
            values.scrollYLength.set(y.scrollLength)
          },
          { ...config.rest, container, target },
        )
        return true
      }

      /**
       * Give a sibling or parent that assigns the ref one microtask before warning.
       */
      const retry = () => {
        tryStart(true)
      }

      if (!tryStart(false))
        microtask.read(retry)

      return () => {
        cancelMicrotask(retry)
        cleanup?.()
      }
    },
  )

  return values
}
