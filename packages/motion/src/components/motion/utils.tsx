import type { Component } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { dynamic } from '@solidjs/web'
import { merge, omit } from 'solid-js'
import { asArray } from '@solid-primitives/utils'
import { MotionContext } from '@/components/context'
import { motionPropKeys } from '@/components/motion/props'
import type { MotionComponentProps, MotionProps } from '@/components/motion/types'
import type { FeatureBundle } from '@/features/dom-animation'
import type { MotionBundle } from '@/state/motion-state'
import type { ElementType } from '@/types'
import { createMotionState } from './use-motion-state'
import { motionComponentSymbol } from './is-motion-component'

export interface MotionCreateOptions extends MotionBundle {
  /** Pass the motion props (`animate`, `whileHover`, ...) on to the wrapped component. */
  forwardMotionProps?: boolean
}

/** A motion component for a fixed element or component: `motion.div`, `m.svg`, ... */
export type MotionTagComponent<T extends string = 'div'> = (
  props: Omit<MotionComponentProps<T extends ElementType ? T : 'div'>, 'as'>,
) => JSX.Element

type MotionCreate = {
  <P extends Record<string, any>>(component: Component<P>, options?: MotionCreateOptions): (
    props: P & Omit<MotionProps, 'as'> & { children?: JSX.Element, ref?: JSX.Ref<any> },
  ) => JSX.Element
  <T extends string>(component: T, options?: MotionCreateOptions): MotionTagComponent<T>
}

export type MotionNameSpace = {
  [K in ElementType]: MotionTagComponent<K>
} & { create: MotionCreate }

const componentMaxCache = new Map<string, Component<any>>()
const componentMiniCache = new Map<string, Component<any>>()

/** Elements that cannot have children. */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

/** `fx` renders as a bare marker attribute, or nothing. */
function normalizeFx(value: unknown): '' | undefined {
  return value === true || value === '' ? '' : undefined
}

/**
 * Creates a motion component from an HTML/SVG tag or a component.
 * Caches string-based components for reuse.
 */
export function createMotionComponent(
  component: string | Component<any>,
  options: MotionCreateOptions = {},
): Component<any> {
  const isString = typeof component === 'string'
  const componentCache = options.renderer ? componentMaxCache : componentMiniCache
  if (isString && componentCache.has(component))
    return componentCache.get(component)!

  const name = isString ? component : component.name || ''
  const bundle: MotionBundle = { renderer: options.renderer, features: options.features }

  const MotionComponent = (props: MotionComponentProps<any>): JSX.Element => {
    const tag = () => (props.as ?? component ?? 'div') as string | Component<any>
    const motion = createMotionState(props, bundle, tag)
    const Tag = dynamic(tag as () => any)

    const isVoid = () => {
      const current = tag()
      return typeof current === 'string' && VOID_TAGS.has(current)
    }
    const forwardMotionProps = () => props.forwardMotionProps ?? options.forwardMotionProps ?? false

    // The element's own attributes, minus everything motion consumes.
    const domProps = omit(props, ...motionPropKeys, 'children', 'ref')
    // Motion props handed to a wrapped component that asked for them.
    const forwarded = () => {
      if (!forwardMotionProps())
        return {}
      const picked: Record<string, any> = {}
      for (const key of motionPropKeys) {
        if (key !== 'as' && key !== 'style' && key in props)
          picked[key] = (props as any)[key]
      }
      return picked
    }

    return (
      <MotionContext value={motion.state}>
        <Tag
          {...merge(domProps, forwarded, motion.attrs)}
          fx={normalizeFx(props.fx)}
          ref={[motion.ref, ...asArray(props.ref)]}
        >
          {isVoid() ? undefined : props.children}
        </Tag>
      </MotionContext>
    )
  }
  Object.defineProperty(MotionComponent, 'name', { value: name ? `motion.${name}` : 'Motion' })
  Object.defineProperty(MotionComponent, motionComponentSymbol, { value: component })

  if (isString)
    componentCache.set(component, MotionComponent)

  return MotionComponent
}

export function createMotionComponentWithFeatures(featureBundle?: FeatureBundle): MotionNameSpace {
  return new Proxy({} as MotionNameSpace, {
    get(_, prop) {
      if (typeof prop !== 'string')
        return undefined
      if (prop === 'create') {
        return (component: string | Component<any>, options?: MotionCreateOptions) =>
          createMotionComponent(component, {
            ...options,
            ...featureBundle,
          })
      }

      return createMotionComponent(prop, {
        ...featureBundle,
      })
    },
  })
}
