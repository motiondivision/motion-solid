import type { Point, TransformPoint } from 'motion-utils'
import type { ElementInput } from './use-dom-ref'
import { resolveElementInput } from './use-dom-ref'

/**
 * Creates a `transformPagePoint` function that accounts for SVG viewBox scaling.
 *
 * When dragging SVG elements inside an SVG whose viewBox differs from the rendered
 * dimensions (e.g. `viewBox="0 0 100 100"` rendered at 500x500 pixels), pointer
 * coordinates have to be transformed to match the SVG's coordinate system.
 *
 * ```tsx
 * let svg: SVGSVGElement | undefined
 * <MotionConfig transformPagePoint={transformViewBoxPoint(() => svg)}>
 *   <svg ref={svg} viewBox="0 0 100 100" width={500} height={500}>
 *     <motion.rect drag width={10} height={10} />
 *   </svg>
 * </MotionConfig>
 * ```
 *
 * @param svg - The SVG element, or an accessor (or `{ current }` object) that returns it
 */
export function transformViewBoxPoint(svg: ElementInput): TransformPoint {
  return (point: Point): Point => {
    const element = resolveElementInput(svg) as SVGSVGElement | undefined
    if (!element)
      return point

    const viewBox = element.viewBox?.baseVal
    if (!viewBox || (viewBox.width === 0 && viewBox.height === 0))
      return point

    const bbox = element.getBoundingClientRect()
    if (bbox.width === 0 || bbox.height === 0)
      return point

    const scaleX = viewBox.width / bbox.width
    const scaleY = viewBox.height / bbox.height

    const svgX = bbox.left + window.scrollX
    const svgY = bbox.top + window.scrollY

    return {
      x: (point.x - svgX) * scaleX + svgX,
      y: (point.y - svgY) * scaleY + svgY,
    }
  }
}
