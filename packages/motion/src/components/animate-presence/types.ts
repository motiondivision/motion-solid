import type { JSX } from '@solidjs/web'

export interface AnimatePresenceProps {
  /**
   * - `sync` (default): entering and exiting children animate at the same time.
   * - `wait`: the entering child waits for the exiting one to finish. Only the first
   *   child is considered, as in React.
   * - `popLayout`: like `sync`, but an exiting element is pinned in place (absolute) so its
   *   siblings reflow immediately.
   */
  mode?: 'wait' | 'popLayout' | 'sync'
  /** Set to `false` to skip the `initial` animation of children present on first render. */
  initial?: boolean
  /**
   * Non-React extension: renders a wrapper element with this tag around the children
   * (React renders none).
   */
  as?: string
  /** Data passed to exiting children's variants and read with `createPresenceData`. */
  custom?: any
  /** Fires once every exiting child has finished and left the DOM. */
  onExitComplete?: VoidFunction
  /** Which horizontal side `popLayout` pins the exiting element to. Default `'left'`. */
  anchorX?: 'left' | 'right'
  /** Which vertical side `popLayout` pins the exiting element to. Default `'top'`. */
  anchorY?: 'top' | 'bottom'
  /**
   * Where `popLayout` inserts its style element (default `document.head`). Set it to a
   * shadow root when rendering inside one.
   */
  root?: HTMLElement | ShadowRoot
  /**
   * Whether the presence of children affects the layout of surrounding `motion` components.
   * When `true` (default) the enclosing `LayoutGroup` re-measures once every exit has finished.
   */
  presenceAffectsLayout?: boolean
  /**
   * When nested in another `AnimatePresence`, also exit this one's children when the parent
   * child that contains it exits (otherwise they just disappear with it).
   */
  propagate?: boolean
  children?: JSX.Element
}
