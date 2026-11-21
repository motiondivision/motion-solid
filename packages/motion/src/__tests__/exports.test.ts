import { describe, expect, it } from 'vitest'
import * as solid from 'solid-js'
import * as solidWeb from '@solidjs/web'
import * as motion from '@/index'

const exported = Object.keys(motion)

describe('public exports', () => {
  it('collide with no solid-js export', () => {
    // No identical re-export of a solid-js function is intended either, so any overlap fails.
    expect(exported.filter(name => name in solid)).toEqual([])
  })

  it('collide with no @solidjs/web export', () => {
    expect(exported.filter(name => name in solidWeb)).toEqual([])
  })

  it('do not leak the names that used to collide', () => {
    for (const name of ['createContext', 'createEffect', 'createComputed', 'memo'])
      expect(exported).not.toContain(name)
    expect(exported).toContain('createComputedMotionValue')
  })

  it('export no use* primitive: use* is for context consumers only', () => {
    const contextConsumers = [
      'useAnimatePresenceContext',
      'useLayoutGroupContext',
      'useLazyMotionContext',
      'useMotionConfig',
      'useMotionContext',
      'useReorderContext',
    ]
    expect(exported.filter(name => /^use[A-Z]/.test(name)).sort()).toEqual(contextConsumers)
  })

  it('keep internals off the root', () => {
    for (const name of ['resolveMotionProps', 'getContextWindow', 'mountedStates', 'resolveElementInput', 'getMotionElement'])
      expect(exported).not.toContain(name)
  })

  it('include the React parity API under Solid names', () => {
    const parity = [
      // components
      'motion', 'm', 'AnimatePresence', 'LayoutGroup', 'LazyMotion', 'MotionConfig', 'Reorder',
      // feature bundles
      'domAnimation', 'domMax', 'domMin',
      // motion values
      'createMotionValue', 'createTransform', 'createSpring', 'createFollowValue', 'createScroll',
      'createVelocity', 'createMotionTemplate', 'createMotionValueEvent', 'createTime',
      'createWillChange', 'WillChangeMotionValue', 'createElementScroll', 'createViewportScroll',
      'resolveMotionValue',
      // accessibility
      'createReducedMotion', 'createReducedMotionConfig',
      // utils
      'createAnimate', 'createScopeMotion', 'createAnimationControls', 'animationControls',
      'createAnimationFrame', 'createCycle', 'createInView', 'createPageInView',
      'createInstantTransition', 'createInstantLayoutTransition', 'disableInstantTransitions',
      'createResetProjection', 'createDragControls', 'DragControls',
      'createPresence', 'createIsPresent', 'createPresenceData',
      'isMotionComponent', 'unwrapMotionComponent', 'isValidMotionProp',
      'transformViewBoxPoint', 'correctParentTransform',
      // contexts
      'MotionConfigContext', 'LayoutGroupContext', 'MotionContext', 'AnimatePresenceContext',
      // re-exported from framer-motion/dom, motion-dom and motion-utils
      'animate', 'scroll', 'inView', 'stagger', 'spring', 'cubicBezier', 'frame', 'MotionGlobalConfig',
      'animateVisualElement', 'addScaleCorrector', 'buildTransform', 'visualElementStore', 'VisualElement',
      'calcLength', 'createBox', 'optimizedAppearDataAttribute', 'arc', 'delay', 'delayInMs',
    ]
    expect(parity.filter(name => !exported.includes(name))).toEqual([])
  })
})
