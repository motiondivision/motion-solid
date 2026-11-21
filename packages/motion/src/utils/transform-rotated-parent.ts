import type { Point, TransformPoint } from 'motion-utils'
import type { ElementInput } from './use-dom-ref'
import { resolveElementInput } from './use-dom-ref'

/**
 * Creates a `transformPagePoint` function that corrects pointer coordinates for a parent
 * with CSS transforms (rotation, scale, skew), so a drag offset is in the parent's local
 * space. Works with static and continuously animating transforms.
 *
 * ```tsx
 * let parent: HTMLDivElement | undefined
 * <motion.div ref={parent} style={{ rotate: 90 }}>
 *   <MotionConfig transformPagePoint={correctParentTransform(() => parent)}>
 *     <motion.div drag />
 *   </MotionConfig>
 * </motion.div>
 * ```
 *
 * @param parent - The transformed parent, or an accessor (or `{ current }` object) that returns it
 */
export function correctParentTransform(parent: ElementInput): TransformPoint {
  return (point: Point): Point => {
    const element = resolveElementInput(parent) as HTMLElement | undefined
    if (!element)
      return point

    const inv = getInverseMatrix(element)
    if (!inv)
      return point

    // Centre of rotation in page space
    const rect = element.getBoundingClientRect()
    const cx = rect.left + window.scrollX + rect.width / 2
    const cy = rect.top + window.scrollY + rect.height / 2

    // Transform (point - centre) through the inverse, then add the centre back
    const dx = point.x - cx
    const dy = point.y - cy
    return {
      x: cx + inv.a * dx + inv.c * dy,
      y: cy + inv.b * dx + inv.d * dy,
    }
  }
}

interface InverseMatrix {
  a: number
  b: number
  c: number
  d: number
}

function getInverseMatrix(element: HTMLElement): InverseMatrix | null {
  const { transform } = getComputedStyle(element)
  if (!transform || transform === 'none')
    return null

  const match
    = transform.match(/^matrix3d\((.*)\)$/u)
      || transform.match(/^matrix\((.*)\)$/u)
  if (!match)
    return null

  const v = match[1].split(',').map(Number)
  const is3d = transform.startsWith('matrix3d')
  const a = v[0]
  const b = v[1]
  const c = is3d ? v[4] : v[2]
  const d = is3d ? v[5] : v[3]

  const det = a * d - b * c
  if (Math.abs(det) < 1e-10)
    return null

  return { a: d / det, b: -b / det, c: -c / det, d: a / det }
}
