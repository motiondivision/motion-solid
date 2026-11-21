import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import type { LayoutGroupState } from '@/components/context'
import type { PresenceContext } from '@/components/animate-presence/presence'
import type { MotionConfigState } from '@/components/motion-config/types'
import type { MotionAliasProps } from '@/components/motion/types'
import type { Options } from '@/types'

/**
 * The context a motion component resolves its props against. Each entry may be a
 * plain value or an accessor (the shape the context hooks return), so the function
 * can be called inside a tracking scope and re-run when any of them change.
 */
export interface MotionResolveContext {
  layoutGroup: MaybeAccessor<LayoutGroupState>
  presenceContext: MaybeAccessor<PresenceContext>
  config: MaybeAccessor<MotionConfigState>
}

/**
 * Merge motion props with context values (layout group, presence, config) and map
 * React-named aliases (`whileTap`, `onTap*`, `globalTapTarget`, `viewport`) onto the
 * internal option names.
 *
 * Reads `props` and the context accessors, so call it inside a memo or render
 * effect; it returns a fresh plain snapshot each call.
 */
export function resolveMotionProps(
  props: Options & MotionAliasProps,
  context: MotionResolveContext,
): Options & { presenceContext: PresenceContext } {
  const layoutGroup = access(context.layoutGroup)
  const presenceContext = access(context.presenceContext)
  const config = access(context.config)

  const layoutId = layoutGroup.id && props.layoutId
    ? `${layoutGroup.id}-${props.layoutId}`
    : props.layoutId || undefined

  const { whileTap, onTap, onTapStart, onTapCancel, globalTapTarget, viewport, ...rest } = props

  return {
    ...rest,
    whilePress: props.whilePress ?? whileTap,
    onPress: props.onPress ?? onTap,
    onPressStart: props.onPressStart ?? onTapStart,
    onPressCancel: props.onPressCancel ?? onTapCancel,
    globalPressTarget: props.globalPressTarget ?? globalTapTarget,
    layoutId,
    transition: props.transition ?? config.transition,
    // Snapshot the reactive getters here (a tracked scope) so the engine reads plain values.
    layoutGroup: { ...layoutGroup, id: layoutGroup.id, group: layoutGroup.group },
    motionConfig: config,
    inViewOptions: props.inViewOptions ?? viewport ?? config.inViewOptions,
    presenceContext,
    initial: presenceContext.initial === false
      ? presenceContext.initial
      : (props.initial === true ? undefined : props.initial),
  }
}
