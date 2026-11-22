import { Feature } from '@/features/feature'
import type { MotionState } from '@/state/motion-state'
import { type IProjectionNode, type NodeGroup, addScaleCorrector, globalProjectionState } from 'motion-dom'
import { defaultScaleCorrector } from './config'
import { isHidden } from '@/utils/is-hidden'
import { registerLayoutNode, snapshotLayoutSiblings } from './coordinator'

export class LayoutFeature extends Feature {
  static key = 'layout' as const
  private registeredGroup: NodeGroup | undefined
  private unregisterCoordinator: VoidFunction | undefined

  constructor(state: MotionState) {
    super(state)
    addScaleCorrector(defaultScaleCorrector)
  }

  private updatePrevLead(isPresent: boolean) {
    const projection = this.state.visualElement.projection as IProjectionNode
    if (projection.isPresent !== isPresent) {
      projection.isPresent = isPresent
      if (isPresent) {
        !projection.isLead() && projection?.promote()
      }
      else {
        projection.isLead() && projection?.relegate()
      }
    }
  }

  private updateLayoutGroup() {
    const { layout, layoutId, layoutGroup } = this.state.options
    if (layout || layoutId)
      globalProjectionState.hasEverUpdated = true

    const nextGroup = layout || layoutId ? layoutGroup?.group : undefined
    if (nextGroup === this.registeredGroup)
      return

    const projection = this.state.visualElement.projection
    if (projection)
      this.registeredGroup?.remove(projection)

    this.registeredGroup = nextGroup
    if (projection)
      this.registeredGroup?.add(projection)
  }

  /** Watch for layout changes caused elsewhere in the tree (see `coordinator.ts`). */
  private updateCoordinator() {
    const { layout, layoutId } = this.state.options
    const element = this.state.element
    const shouldRegister = Boolean((layout || layoutId) && element && this.state.visualElement.projection)
    if (shouldRegister && !this.unregisterCoordinator) {
      this.unregisterCoordinator = registerLayoutNode(this.state.visualElement.projection as IProjectionNode, element!)
    }
    else if (!shouldRegister && this.unregisterCoordinator) {
      this.unregisterCoordinator()
      this.unregisterCoordinator = undefined
    }
  }

  didUpdate() {
    if (this.state.options.layout || this.state.options.layoutId || this.state.options.drag) {
      this.state.visualElement.projection?.root?.didUpdate()
    }
  }

  mount() {
    const options = this.state.options
    if (options.layout || options.layoutId) {
      const projection = this.state.visualElement.projection
      if (options.layoutId) {
        const isPresent = !isHidden(this.state.element as HTMLElement)
        projection.isPresent = isPresent
        if (isPresent) {
          projection?.promote()
        }
        else {
          projection?.relegate()
        }
      }
    }
    this.updateLayoutGroup()
    this.updateCoordinator()
    this.didUpdate()
  }

  update() {
    this.updateLayoutGroup()
    this.updateCoordinator()
  }

  unmount() {
    this.unregisterCoordinator?.()
    this.unregisterCoordinator = undefined
    const projection = this.state.visualElement.projection
    if (projection)
      this.registeredGroup?.remove(projection)
    this.registeredGroup = undefined
  }

  /**
   * Capture a layout snapshot. Options are always refreshed by the caller
   * before this runs (updateOptions → lifecycle hook), so the only remaining
   * signal is presence: an exiting element is treated as not present.
   */
  getSnapshot(isPresent: boolean): void {
    const projection = this.state.visualElement.projection
    this.updateLayoutGroup()
    const { layout, layoutId, drag, layoutDependency } = this.state.visualElement.props
    // prevProps is unset until the visual element's first update, e.g. when an element
    // unmounts before any prop change.
    const prevProps = this.state.visualElement.prevProps
    if (!projection || (!layout && !layoutId && !drag)) {
      return
    }

    /**
     * If drag is enabled, no layoutDependency is set, or presence changed,
     * we need to update the snapshot
     */
    if (
      drag
      || prevProps?.layoutDependency !== layoutDependency
      || layoutDependency === undefined // ← 没传 layoutDependency 时,每次重渲染都 willUpdate
      || isPresent !== projection.isPresent
    ) {
      projection.willUpdate()
      // Siblings move when this node changes size or leaves: snapshot them before the DOM does.
      if (layout || layoutId)
        snapshotLayoutSiblings(projection)
    }

    /**
     * If presence has changed, promote or relegate the projection accordingly
     */
    if (layoutId) {
      this.updatePrevLead(isPresent)
    }

    this.didUpdate()
  }

  refreshRootScroll() {
    const root = this.state.visualElement?.projection?.root
    if (root && this.state.options.layoutId) {
      root.scroll = undefined
      root.updateScroll?.()
    }
  }
}
