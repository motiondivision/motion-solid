import { onSettled } from 'solid-js'
import { animationControls } from './animation-controls'

/**
 * Creates `AnimationControls`, which can be used to manually start, stop
 * and sequence animations on one or more components.
 *
 * Pass the returned controls to the `animate` prop of the components you want
 * to animate, then drive them with `start`, `set` and `stop`. `start` and
 * `set` must be called after mount (for example from an event handler or
 * `onSettled`).
 *
 * ```tsx
 * const controls = createAnimationControls()
 * onSettled(() => { controls.start({ x: 100, transition: { duration: 0.5 } }) })
 * return <motion.div animate={controls} />
 * ```
 *
 * Must be called with an owner (a component body or `createRoot`): it marks the controls
 * as mounted in `onSettled`, and stops them on disposal. To create controls without an
 * owner, use `animationControls()` and call `mount()` yourself.
 *
 * @public
 */
export function createAnimationControls() {
  const controls = animationControls()
  onSettled(() => controls.mount())
  return controls
}
