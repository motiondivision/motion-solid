import type { Accessor } from 'solid-js'
import { createEffect, createMemo, createRenderEffect, merge, omit, onCleanup, onSettled } from 'solid-js'
import { isMotionValue, rootProjectionNode } from 'motion-dom'
import { invariant, warning } from 'motion-utils'
import { useLayoutGroupContext, useMotionContext } from '@/components/context'
import { useLazyMotionContext } from '@/components/lazy-motion/context'
import { useMotionConfig } from '@/components/motion-config/context'
import { useAnimatePresenceContext } from '@/components/animate-presence/presence'
import { motionPropDefaults } from '@/components/motion/props'
import { MotionState } from '@/state'
import type { MotionBundle } from '@/state/motion-state'
import { createSVGStyles, createStyles } from '@/state/style'
import type { Options } from '@/types'
import { resolveMotionProps } from '@/utils/resolve-motion-props'

/**
 * The props a motion component hands to `createMotionState`: its own props plus the
 * `as` tag the component renders (resolved by the caller, so `as` can be a prop).
 */
export type MotionStateProps = Record<string, any>

export interface MotionStateResult {
  state: MotionState
  /** Resolved motion options (context merged in, React aliases mapped). */
  options: Accessor<Options>
  /**
   * The attributes the component renders for the motion side of the element: `style`
   * (user style plus the values motion computed) and, for SVG, the attributes motion
   * moves out of style. Only re-computed when the user's props change, so spreading it
   * re-applies what the user changed and leaves frame-loop writes alone.
   */
  attrs: Accessor<Record<string, any>>
  /** Include in the rendered element's `ref` (alongside the user's own refs). */
  ref: (el: Element) => void
}

/**
 * Solid writes object styles with `style.setProperty`, which wants dash-case names;
 * motion builds camelCase ones (and keeps CSS variables as they are).
 */
function toCssProperties(style: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key in style) {
    const name = key.startsWith('--') || key.includes('-')
      ? key
      : key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
    result[name] = style[key]
  }
  return result
}

/**
 * Mount callbacks of children that settled before their parent mounted, by parent.
 * Solid settles parents before children, but a parent's animation needs its variant
 * children registered when it starts, as when children mount first in Vue or React.
 * The parent therefore mounts its pending children (depth first) before itself.
 */
const pendingChildMounts = new WeakMap<MotionState, Set<() => void>>()

/**
 * Creates and owns the `MotionState` of one motion component.
 *
 * Lifecycle (Vue to Solid):
 * - state is created in the first run of the options memo, with the parent state from context
 * - `onSettled` mounts it with the real element
 * - a split render effect pushes prop changes (`updateOptions` + `beforeUpdate`), an effect
 *   finishes them (`update`)
 * - `onCleanup` snapshots and unmounts, unless an AnimatePresence exit still holds the element
 */
export function createMotionState(
  props: MotionStateProps,
  bundle: MotionBundle,
  tag: Accessor<unknown>,
): MotionStateResult {
  const parentState = useMotionContext()
  const layoutGroup = useLayoutGroupContext()
  const config = useMotionConfig()
  const presenceContext = useAnimatePresenceContext()
  const lazyMotion = useLazyMotionContext()

  // `children` and `ref` are not options: reading `children` would instantiate them.
  const optionProps = merge(motionPropDefaults, omit(props, 'children', 'ref', 'forwardMotionProps'))

  let state!: MotionState
  let element: Element | undefined

  const options = createMemo<Options>(() => {
    const resolved = {
      ...resolveMotionProps(optionProps as any, { layoutGroup, presenceContext, config }),
      as: tag() as Options['as'],
    }
    if (!state) {
      /**
       * Rendering a full `motion` component below LazyMotion defeats its file-size
       * benefit. Checked once, when the state is created.
       */
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && bundle.renderer && lazyMotion.strict) {
        const strictMessage
          = 'You have rendered a `motion` component within a `LazyMotion` component. This will break tree shaking. Import and render a `m` component instead.'
        props.ignoreStrict
          ? warning(false, strictMessage)
          : invariant(false, strictMessage)
      }
      // A shared layout animation takes over from the lead, so this one must not play `initial`.
      if (
        props.initial
        && resolved.layoutId
        && rootProjectionNode.current?.sharedNodes.get(resolved.layoutId)?.lead
      ) {
        resolved.initial = false
      }
      state = new MotionState(resolved, parentState!, bundle)
    }
    return resolved
  })

  // The memo is eager, so `state` exists before children render and read it from context.

  // Features arriving from LazyMotion (a no-op for a component with its own bundle).
  createRenderEffect(
    () => {
      // Surfaces an error thrown while creating the state (e.g. the LazyMotion strict
      // check). Once the state exists the options are not a dependency of this effect.
      if (!state)
        options()
      return lazyMotion.features()
    },
    (features) => {
      state.setBundle(features)
    },
  )

  const attrs = createMemo(() => {
    options() // re-evaluate when the resolved options change (e.g. `as`)
    const isSVG = state.type === 'svg'
    const currentValues = state.visualElement?.latestValues || state.latestValues
    const userStyle = props.style as Record<string, any> | undefined
    const attrsProps: Record<string, any> = {}
    let styleProps: Record<string, any> = {
      ...userStyle,
      ...(isSVG ? {} : currentValues),
    }
    // Extract MotionValue objects to their current values
    // (buildSVGAttrs/buildHTMLStyles expect plain values)
    for (const key in styleProps) {
      if (isMotionValue(styleProps[key]))
        styleProps[key] = styleProps[key].get()
    }
    if (isSVG) {
      const { attrs: svgAttrs, style: svgStyle } = createSVGStyles(
        { ...currentValues, ...styleProps },
        state.options.as as string,
        userStyle,
      )
      Object.assign(attrsProps, svgAttrs)
      styleProps = svgStyle
    }
    if (props.drag && props.dragListener !== false) {
      Object.assign(styleProps, {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: props.drag === true
          ? 'none'
          : `pan-${props.drag === 'x' ? 'y' : 'x'}`,
      })
    }
    const style = createStyles(styleProps, props.transformTemplate)
    if (style)
      attrsProps.style = toCssProperties(style)
    return attrsProps
  })

  // Before the DOM updates: hand motion the new options and let layout take its snapshot.
  createRenderEffect(
    () => [options(), layoutGroup.key?.()] as const,
    ([latest]) => {
      state.updateOptions(latest)
      state.beforeUpdate()
    },
    { defer: true },
  )

  // After the DOM updated.
  createEffect(
    () => [options(), layoutGroup.key?.()] as const,
    () => {
      // `as` rebuilt the element: the state is still bound to the detached one.
      if (state.isMounted() && element && state.element !== element) {
        state.unmount()
        state.mount(element as HTMLElement | SVGElement)
      }
      state.update()
    },
    { defer: true },
  )

  let mountStarted = false
  function mountTree() {
    if (mountStarted)
      return
    mountStarted = true
    const children = pendingChildMounts.get(state)
    pendingChildMounts.delete(state)
    children?.forEach(mountChild => mountChild())
    if (!element) {
      warning(false, 'Motion could not find the element to animate. If `as` is a component, it must forward its `ref` to the element.')
      return
    }
    state.mount(element as HTMLElement | SVGElement)
  }

  // Only a parent that has not mounted yet can mount this state for us.
  const awaitingParent = parentState && !parentState.isMounted() ? parentState : undefined
  if (awaitingParent) {
    const siblings = pendingChildMounts.get(awaitingParent) ?? new Set()
    siblings.add(mountTree)
    pendingChildMounts.set(awaitingParent, siblings)
  }

  onSettled(mountTree)

  onCleanup(() => {
    if (awaitingParent)
      pendingChildMounts.get(awaitingParent)?.delete(mountTree)
    state.beforeUnmount()
    const el = element
    // An element still connected is held in the DOM by an AnimatePresence exit; that
    // session unmounts the state when it finishes. Disposal can run before the node is
    // detached, so check again once the removal has landed.
    const unmountIfDetached = () => {
      if (state.isMounted() && !el?.isConnected)
        state.unmount()
    }
    if (el?.isConnected)
      queueMicrotask(unmountIfDetached)
    else
      unmountIfDetached()
  })

  // The component forwards the user's `ref` itself (`ref={[motion.ref, ...asArray(props.ref)]}`),
  // where it is read in a tracked position. This only records the element.
  function ref(el: Element) {
    element = el
  }

  return { state, options, attrs, ref }
}
