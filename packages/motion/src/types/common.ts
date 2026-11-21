import type { Component } from 'solid-js'
import type { ComponentProps as SolidComponentProps, JSX, ValidComponent } from '@solidjs/web'

export type { Accessor } from 'solid-js'
export type { MaybeAccessor } from '@solid-primitives/utils'

/** Any intrinsic HTML/SVG tag name. */
export type ElementType = Extract<keyof JSX.IntrinsicElements, string>
/** What the `as` prop accepts: an intrinsic tag, any other string, or a Solid component. */
export type AsTag = ElementType | ({} & string) | Component<any>

/** Props of a Solid component or intrinsic element. */
export type ComponentProps<T> = T extends ValidComponent ? SolidComponentProps<T> : never
