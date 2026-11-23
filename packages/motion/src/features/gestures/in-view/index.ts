import { Feature } from '@/features/feature'
import { frame } from 'motion-dom'
import { inView } from 'framer-motion/dom'

export class InViewGesture extends Feature {
  static key = 'inView' as const

  private removeObserver: VoidFunction | undefined

  constructor(state) {
    super(state)
  }

  private isActive() {
    const { whileInView, onViewportEnter, onViewportLeave } = this.state.options as any
    return Boolean(whileInView || onViewportEnter || onViewportLeave)
  }

  private startObserver() {
    const element = this.state.element as Element
    if (!element || !this.isActive())
      return
    // Not available everywhere (jsdom, some SSR/test environments); nothing to observe then.
    if (typeof IntersectionObserver === 'undefined')
      return

    this.removeObserver?.()
    const { once, ...viewOptions } = (this.state.options as any).inViewOptions || {}
    this.removeObserver = inView(
      element,
      (_, entry) => {
        const props = this.state.options as any
        this.state.setActive('whileInView', true)
        if (props.onViewportEnter) {
          frame.postRender(() => props.onViewportEnter(entry))
        }
        if (!once) {
          return (leaveEntry: IntersectionObserverEntry) => {
            this.state.setActive('whileInView', false)
            const leaveCallback = (this.state.options as any).onViewportLeave
            if (leaveCallback) {
              // The leave entry, not the one captured on entering.
              frame.postRender(() => leaveCallback(leaveEntry))
            }
          }
        }
      },
      viewOptions,
    )
  }

  mount() {
    this.startObserver()
  }

  update() {
    const active = this.isActive()
    if (!active) {
      // Every viewport prop was removed: stop observing, and leave the in-view state if the
      // element was in view (nothing would ever clear it otherwise).
      if (this.removeObserver) {
        this.unmount()
        this.state.setActive('whileInView', false)
      }
      return
    }
    // The first viewport prop was set after mount: nothing is observing yet.
    if (!this.removeObserver) {
      this.startObserver()
      return
    }
    const { props, prevProps } = this.state.visualElement
    const hasOptionsChanged = ['amount', 'margin', 'root'].some((name) => {
      const current = (props as any).inViewOptions?.[name]
      const prev = (prevProps as any)?.inViewOptions?.[name]
      return current !== prev
    })
    if (hasOptionsChanged) {
      this.startObserver()
    }
  }

  unmount() {
    this.removeObserver?.()
    this.removeObserver = undefined
  }
}
