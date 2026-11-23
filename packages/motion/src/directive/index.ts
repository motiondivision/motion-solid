import { createEffect, createMemo, createRenderEffect, getOwner, onCleanup, onSettled, untrack } from 'solid-js'
import { access, tryOnCleanup } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { warning } from 'motion-utils'
import type { Options } from '@/types'
import type { FeatureBundle } from '@/features/dom-animation'
import { domMax } from '@/features/dom-max'
import { MotionState } from '@/state'
import { createVisualElement as defaultRenderer } from '@/state/create-visual-element'
import { createSVGStyles, createStyles } from '@/state/style'
import { isSVGElement, resolveInitialValues } from '@/state/utils'
import { useLayoutGroupContext } from '@/components/context'
import { useAnimatePresenceContext } from '@/components/animate-presence/presence'
import { useMotionConfig } from '@/components/motion-config/context'
import { resolveMotionProps } from '@/utils/resolve-motion-props'
import { afterFlush } from '@/utils/after-flush'

/**
 * Motion props accepted by the ref factories. Same syntax as the props of `<Motion>`
 * (animate, initial, exit, variants, transition, while*, drag, layout, ...).
 */
export type MotionRefOptions = Options

/** The ref callback a motion ref factory returns: `<div ref={attachMotion({ ... })} />`. */
export type MotionRef = (el: HTMLElement | SVGElement) => void

/**
 * A ref factory. Call it in a component body (or any owner) with the motion props, or
 * an accessor of them for props that change over time, and pass the result as `ref`.
 */
export type MotionRefFactory = (options?: MaybeAccessor<MotionRefOptions | undefined>) => MotionRef

function computeStyles(
  values: Record<string, any>,
  tag: string,
  styleProp?: Record<string, any>,
): { styles: Record<string, any> | null, attrs?: Record<string, any> } {
  if (isSVGElement(tag as any)) {
    const { attrs, style } = createSVGStyles({ ...values }, tag, styleProp)
    return { styles: createStyles(style), attrs }
  }
  return { styles: createStyles({ ...styleProp, ...values }) }
}

/**
 * The inline style a server render should emit for the given motion props (the initial
 * values, or the animate values when `initial` is false). Ref factories do not run on the
 * server, so this is the counterpart of motion-vue's `getSSRProps`: spread it into
 * `style` yourself. Keys are dash-case CSS property names (custom properties are kept as
 * they are), as Solid's server `style` serializer writes keys verbatim. For SVG tags only
 * the style is returned: the attributes motion moves out of style (`r`, `cx`, `pathLength`,
 * ...) are not emitted. Returns `null` when there is nothing to emit.
 */
export function getMotionSSRStyle(options: MotionRefOptions, tag = 'div'): Record<string, any> | null {
  const latestValues = resolveInitialValues(options)
  if (Object.keys(latestValues).length === 0)
    return null
  const { styles } = computeStyles(latestValues, tag, options.style)
  return styles && toCssProperties(styles)
}

/** camelCase to dash-case; custom properties (`--x`) and already dashed names stay as they are. */
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
 * The tag name motion expects: lower case for HTML, as written for SVG (`radialGradient`, `clipPath`,
 * `feGaussianBlur`), where `tagName` keeps its case and the `svgElements` list is camelCase too.
 */
function motionTagName(el: Element): string {
  return el.namespaceURI === 'http://www.w3.org/2000/svg' ? el.localName : el.tagName.toLowerCase()
}

function applyInitialStyles(el: HTMLElement | SVGElement, state: MotionState) {
  const { styles, attrs } = computeStyles(state.latestValues, motionTagName(el), state.options.style)
  if (attrs) {
    for (const key in attrs) el.setAttribute(key, String(attrs[key]))
  }
  if (styles) {
    const cssStyles = toCssProperties(styles)
    for (const key in cssStyles) el.style.setProperty(key, String(cssStyles[key]))
  }
}

/**
 * Create a motion ref factory with the given feature bundle (default: `domMax`, all
 * features). Solid 2 has no `use:` directives; a ref factory is the equivalent.
 *
 * Two phases, as Solid 2 requires for refs: the factory runs in the owner (it builds the
 * resolved options memo and the update effects, and registers cleanup); the returned
 * callback only records the element. The `MotionState` is created and mounted once the
 * owner settles, which also applies the initial styles before the first frame.
 *
 * Differences from `<Motion>`:
 * - no parent-variant propagation: the element neither inherits variants from a parent
 *   motion component nor provides them to descendants (the layout group, presence and
 *   MotionConfig contexts are still honoured);
 * - no SSR: refs do not run on the server, use `getMotionSSRStyle`;
 * - the element is yours: motion writes `style` straight from its frame loop, so do not
 *   also drive the same properties through a Solid `style` prop.
 *
 * @param featureBundle - Optional feature bundle (`domAnimation` or `domMax`)
 * @param defaultOptions - Optional default props merged under the per-use props
 */
export function createAttachMotion(
  featureBundle?: FeatureBundle,
  defaultOptions?: MotionRefOptions,
): MotionRefFactory {
  const renderer = featureBundle?.renderer ?? defaultRenderer
  const features = featureBundle?.features ?? domMax.features

  return (input) => {
    const layoutGroup = useLayoutGroupContext()
    const presenceContext = useAnimatePresenceContext()
    const config = useMotionConfig()

    let element: HTMLElement | SVGElement | undefined
    let state: MotionState | undefined

    const options = createMemo<Options>(() => resolveMotionProps(
      { ...defaultOptions, ...access(input) },
      { layoutGroup, presenceContext, config },
    ))
    const withTag = (latest: Options): Options => ({
      ...latest,
      as: motionTagName(element!) as Options['as'],
    })

    // Before the DOM updates: hand motion the new options and let layout snapshot.
    createRenderEffect(
      () => [options(), layoutGroup.key?.()] as const,
      ([latest]) => {
        if (!state)
          return
        state.updateOptions(withTag(latest))
        state.getSnapshot(true)
      },
      { defer: true },
    )

    // After the DOM updated.
    createEffect(
      () => [options(), layoutGroup.key?.()] as const,
      () => {
        state?.update()
      },
      { defer: true },
    )

    onSettled(() => {
      if (!element) {
        warning(false, 'The motion ref was not attached to an element, so nothing will animate.')
        return
      }
      state = new MotionState(withTag(options()), undefined, { renderer, features })
      applyInitialStyles(element, state)
      state.mount(element)
    })

    onCleanup(() => {
      const current = state
      if (!current)
        return
      current.beforeUnmount()
      const el = element
      // Still connected means an exit animation holds the element; it unmounts the
      // state itself when it finishes. Disposal can precede detaching, so re-check.
      const unmountIfDetached = () => {
        if (current.isMounted() && !el?.isConnected)
          current.unmount()
      }
      if (el?.isConnected)
        afterFlush(unmountIfDetached)
      else
        unmountIfDetached()
    })

    return (el) => {
      element = el
    }
  }
}

/**
 * Create a preset ref factory with default motion props baked in. Props passed at the
 * use site still override any preset key.
 *
 * @example
 * ```tsx
 * const fadeIn = createPresetMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })
 * <div ref={fadeIn()} />
 * <div ref={fadeIn({ transition: { duration: 1 } })} />
 * ```
 */
export function createPresetMotion(
  preset: MotionRefOptions,
  featureBundle?: FeatureBundle,
): MotionRefFactory {
  return createAttachMotion(featureBundle ?? domMax, preset)
}

/** Motion ref factory with all features: `<div ref={attachMotion({ animate: { x: 100 } })} />`. */
export const attachMotion: MotionRefFactory = createAttachMotion(domMax)

/**
 * Attach motion to an element you already have, right now, and get back a function that
 * removes it. The imperative counterpart of the `attachMotion` ref factory, and the same
 * shape as `makeEventListener` in Solid Primitives: non-reactive (a plain options object,
 * no signals are read), it attaches immediately, is removed when the owner it was called
 * in is disposed, and returns a disposer for earlier removal.
 *
 * Use it for an element you create or receive yourself (a third-party widget, a node from
 * `document.createElement`). For an element in your own JSX, pass `attachMotion(options)`
 * as `ref` instead, and give that an accessor when the options change over time. Here, to
 * change the options, remove motion and call `makeMotion` again.
 *
 * Call it from a component body, a computation, or outside any owner. Like
 * `makeEventListener`, it registers its cleanup with the current owner, which Solid 2
 * forbids inside `onSettled` and an effect's apply callback: there, call it from the
 * component body instead. The same differences from `<Motion>` apply: no parent-variant
 * propagation (the layout group, presence and `MotionConfig` contexts are still honoured, read
 * once when it is called) and no SSR.
 *
 * @example
 * ```tsx
 * function Widget() {
 *   const el = createThirdPartyWidget()
 *   makeMotion(el, { animate: { opacity: 1 }, whileHover: { scale: 1.05 } }) // removed with Widget
 *   return el
 * }
 * ```
 *
 * @param element - The element to animate
 * @param options - Motion props (not an accessor)
 * @param featureBundle - Optional feature bundle (`domAnimation` or `domMax`, the default)
 */
export function makeMotion(
  element: HTMLElement | SVGElement,
  options: MotionRefOptions = {},
  featureBundle?: FeatureBundle,
): VoidFunction {
  const owned = getOwner() !== null
  const resolved = resolveMotionProps(options, {
    layoutGroup: owned ? useLayoutGroupContext() : {},
    presenceContext: owned ? useAnimatePresenceContext() : {},
    // A snapshot on purpose: makeMotion is non-reactive, so the MotionConfig in effect when it is
    // called is the one the element gets. Use `attachMotion` for config that follows changes.
    config: owned ? untrack(useMotionConfig()) : {},
  })
  const state = new MotionState(
    { ...resolved, as: motionTagName(element) as Options['as'] },
    undefined,
    { renderer: featureBundle?.renderer ?? defaultRenderer, features: featureBundle?.features ?? domMax.features },
  )
  applyInitialStyles(element, state)
  state.mount(element)

  let removed = false
  const remove = () => {
    if (removed)
      return
    removed = true
    state.beforeUnmount()
    state.unmount()
  }
  return tryOnCleanup(remove) as VoidFunction
}
