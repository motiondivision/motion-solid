import type { JSX } from '@solidjs/web'
import type { MotionValue } from 'motion-dom'
import type { Options } from './state'
import type { ElementType } from '@/types/common'

/** Keys that never accept a MotionValue: motion props, handlers, aria and framework keys. */
type NonMotionKeys<A> = Extract<
  keyof A,
  keyof Options | 'style' | 'children' | 'ref' | `on${string}` | `on:${string}` | `aria-${string}` | `attr:${string}` | `prop:${string}` | `bool:${string}`
>

type SVGAttributesWithoutMotionProps<A> = Pick<A, Exclude<keyof A, NonMotionKeys<A>>>

/**
 * @public
 */
export interface CustomValueType {
  mix: (from: any, to: any) => (p: number) => number | string
  toValue: () => number | string
}
export type MakeCustomValueType<T> = { [K in keyof T]: T[K] | CustomValueType }

export type MakeMotion<T> = MakeCustomValueType<{
  [K in keyof T]:
    | T[K]
    | MotionValue<number>
    | MotionValue<string>
    | MotionValue<any> // A permissive type for Custom value types
}>

/**
 * Blanket-accept any SVG attribute as a `MotionValue`
 * @public
 */
export type SVGAttributesAsMotionValues<A = JSX.SVGAttributes<SVGElement>> = MakeMotion<
  SVGAttributesWithoutMotionProps<A>
>

/** Tags that exist only in SVG (not also in HTML), keyed like Solid's intrinsic elements. */
type SVGOnlyTag = Exclude<keyof JSX.SVGElementTags, keyof JSX.HTMLElementTags>

/** Per-tag SVG attributes, each accepting MotionValues. */
export type SVGAttributesWithMotionValues = {
  [K in SVGOnlyTag]: SVGAttributesAsMotionValues<JSX.SVGElementTags[K]>
}

export type SetMotionValueType<T, Keys extends keyof T> = {
  [K in keyof T]: K extends Keys ? SVGAttributesAsMotionValues<T[K]> : T[K]
}

type IntrinsicElementAttributesAsMotionValues = SetMotionValueType<JSX.IntrinsicElements, keyof SVGAttributesWithMotionValues>

export type MotionHTMLAttributes<C extends ElementType> = Omit<IntrinsicElementAttributesAsMotionValues[C], keyof Options | 'style' | 'as' | 'fx'>
