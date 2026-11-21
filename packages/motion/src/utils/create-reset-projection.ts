import { rootProjectionNode } from 'motion-dom'

/**
 * Returns a function that resets the layout projection tree, so every layout animation
 * measures from scratch. Useful after changes motion cannot see, such as a window resize
 * that moves layout-animated elements.
 */
export function createResetProjection(): () => void {
  return () => {
    rootProjectionNode.current?.resetTree()
  }
}
