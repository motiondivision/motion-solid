import { AnimationFeature } from '@/features/animation/animation'
import { ExitFeature } from '@/features/exit/exit'
import type { FeatureBundle } from '@/features/dom-animation'
import { createVisualElement } from '@/state/create-visual-element'

/**
 * The smallest bundle: the renderer plus animation (`animate`, `variants`) and `exit`
 * support. No gestures, layout or drag. Use with `LazyMotion` and `m`.
 */
export const domMin: FeatureBundle = {
  renderer: createVisualElement,
  features: [
    AnimationFeature,
    ExitFeature,
  ],
}
