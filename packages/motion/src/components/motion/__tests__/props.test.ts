import { describe, expect, test } from 'vitest'
import { isMotionProp, motionPropDefaults, motionPropKeys } from '../props'

describe('motion prop keys', () => {
  test('has no duplicates', () => {
    expect(new Set(motionPropKeys).size).toBe(motionPropKeys.length)
  })

  test('covers motion-vue declared props (minus asChild)', () => {
    const vueKeys = ['fx', 'ignoreStrict', 'forwardMotionProps', 'whileDrag', 'whileHover', 'whilePress', 'whileInView', 'whileFocus', 'custom', 'initial', 'animate', 'exit', 'variants', 'inherit', 'style', 'transformTemplate', 'transition', 'onAnimationComplete', 'onUpdate', 'layout', 'layoutId', 'layoutScroll', 'layoutRoot', 'layoutAnchor', 'data-framer-portal-id', 'crossfade', 'layoutDependency', 'onBeforeLayoutMeasure', 'onLayoutMeasure', 'onLayoutAnimationStart', 'onLayoutAnimationComplete', 'globalPressTarget', 'onPressStart', 'onPress', 'onPressCancel', 'onHoverStart', 'onHoverEnd', 'inViewOptions', 'onViewportEnter', 'onViewportLeave', 'drag', 'dragSnapToOrigin', 'dragDirectionLock', 'dragPropagation', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition', 'dragListener', 'dragControls', 'onDragStart', 'onDragEnd', 'onDrag', 'onDirectionLock', 'onDragTransitionEnd', 'onMeasureDragConstraints', 'onPanSessionStart', 'onPanStart', 'onPan', 'onPanEnd']
    for (const k of vueKeys) expect(isMotionProp(k), k).toBe(true)
    expect(isMotionProp('asChild')).toBe(false)
  })

  test('covers React names', () => {
    for (const k of ['whileTap', 'onTap', 'onTapStart', 'onTapCancel', 'globalTapTarget', 'viewport', 'onAnimationStart', 'onHoverStart']) {
      expect(isMotionProp(k), k).toBe(true)
    }
  })

  test('leaves DOM props alone', () => {
    for (const k of ['class', 'id', 'draggable', 'onClick', 'onclick', 'ref', 'children', 'aria-label']) {
      expect(isMotionProp(k), k).toBe(false)
    }
  })

  test('defaults keep inherit and initial undefined', () => {
    expect('inherit' in motionPropDefaults).toBe(false)
    expect('initial' in motionPropDefaults).toBe(false)
    expect(motionPropDefaults.dragElastic).toBe(0.5)
  })
})
