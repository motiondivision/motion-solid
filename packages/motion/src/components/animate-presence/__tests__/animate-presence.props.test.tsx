import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush, Show } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { AnimatePresence } from '@/components/animate-presence'
import { LayoutGroupContext } from '@/components/context'
import { Motion } from '@/components/motion'
import { mountedStates } from '@/state/motion-state'
import { delay } from '@/shared/test'

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? document.body : null
  },
})

const fade = (duration: number) => ({
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration },
})

describe('AnimatePresence primitive children', () => {
  it('keeps strings and numbers and removes them immediately', async () => {
    const [show, setShow] = createSignal(true)
    const { container } = render(() => (
      <AnimatePresence>
        {'hello'}
        <Show when={show()}>{42}</Show>
      </AnimatePresence>
    ))
    await delay(20)
    expect(container.textContent).toBe('hello42')
    setShow(false)
    flush()
    await delay(20)
    expect(container.textContent).toBe('hello')
  })

  it('shows a text-only child in wait mode', async () => {
    const [text, setText] = createSignal('one')
    const { container } = render(() => <AnimatePresence mode="wait">{text()}</AnimatePresence>)
    await delay(20)
    expect(container.textContent).toBe('one')
    setText('two')
    flush()
    await delay(20)
    expect(container.textContent).toBe('two')
  })
})

describe('AnimatePresence propagate', () => {
  function setup(propagate: boolean) {
    const innerDone = vi.fn()
    const outerDone = vi.fn()
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence onExitComplete={outerDone}>
        <Show when={show()}>
          <div class="outer">
            <AnimatePresence propagate={propagate} onExitComplete={innerDone}>
              <Motion class="inner" {...fade(0.2)} />
            </AnimatePresence>
          </div>
        </Show>
      </AnimatePresence>
    ))
    return { show, setShow, innerDone, outerDone }
  }

  it('exits the nested children and holds the parent child until they finish', async () => {
    const { setShow, innerDone, outerDone } = setup(true)
    await delay(30)
    const outer = document.querySelector('.outer') as HTMLElement
    const inner = document.querySelector('.inner') as HTMLElement
    setShow(false)
    flush()
    await delay(80)
    expect(outer.isConnected).toBe(true)
    expect(Number(inner.style.opacity)).toBeLessThan(1)
    expect(outerDone).not.toHaveBeenCalled()
    await delay(400)
    expect(outer.isConnected).toBe(false)
    expect(Number(inner.style.opacity)).toBe(0)
    await delay(20)
    expect(mountedStates.get(inner)).toBeUndefined()
    expect(innerDone).toHaveBeenCalledTimes(1)
    expect(outerDone).toHaveBeenCalledTimes(1)
  })

  it('without propagate the parent child leaves at once and the nested exit never runs', async () => {
    const { setShow, innerDone } = setup(false)
    await delay(30)
    const outer = document.querySelector('.outer') as HTMLElement
    const inner = document.querySelector('.inner') as HTMLElement
    setShow(false)
    flush()
    await delay(60)
    expect(outer.isConnected).toBe(false)
    expect(inner.style.opacity).toBe('1')
    expect(innerDone).not.toHaveBeenCalled()
  })
})

describe('AnimatePresence presenceAffectsLayout', () => {
  function setup(presenceAffectsLayout?: boolean) {
    const forceRender = vi.fn()
    const [show, setShow] = createSignal(true)
    render(() => (
      <LayoutGroupContext value={{ forceRender, key: () => 0 }}>
        <AnimatePresence presenceAffectsLayout={presenceAffectsLayout}>
          <Show when={show()}><Motion class="a" {...fade(0.05)} /></Show>
        </AnimatePresence>
      </LayoutGroupContext>
    ))
    return { setShow, forceRender }
  }

  it('forces the layout group to re-measure once every exit finished (default)', async () => {
    const { setShow, forceRender } = setup()
    await delay(30)
    setShow(false)
    flush()
    expect(forceRender).not.toHaveBeenCalled()
    await delay(250)
    expect(forceRender).toHaveBeenCalledTimes(1)
  })

  it('does not when presenceAffectsLayout is false', async () => {
    const { setShow, forceRender } = setup(false)
    await delay(30)
    setShow(false)
    flush()
    await delay(250)
    expect(document.querySelector('.a')).toBeNull()
    expect(forceRender).not.toHaveBeenCalled()
  })
})

describe('AnimatePresence popLayout anchors and root', () => {
  const popCss = (parent: ParentNode = document.head) =>
  [...parent.querySelectorAll('style')]
    .flatMap(style => [...(style.sheet?.cssRules ?? [])].map(rule => rule.cssText))
    .join('')

function popRule(root?: () => HTMLElement, anchorX?: 'left' | 'right', anchorY?: 'top' | 'bottom') {
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence mode="popLayout" anchorX={anchorX} anchorY={anchorY} root={root?.()}>
        <Show when={show()}><Motion class="p" {...fade(0.3)} /></Show>
      </AnimatePresence>
    ))
    return { setShow }
  }

  it('defaults to top/left', async () => {
    const { setShow } = popRule()
    await delay(30)
    setShow(false)
    flush()
    await delay(30)
    const css = popCss()
    expect(css).toContain('top:')
    expect(css).toContain('left:')
    expect(css).not.toContain('bottom:')
    expect(css).not.toContain('right:')
    await delay(400)
  })

  it('anchors to bottom/right', async () => {
    const { setShow } = popRule(undefined, 'right', 'bottom')
    await delay(30)
    setShow(false)
    flush()
    await delay(30)
    const css = popCss()
    expect(css).toContain('bottom:')
    expect(css).toContain('right:')
    expect(css).not.toContain('top:')
    await delay(400)
  })

  it('inserts the style element into `root`', async () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const { setShow } = popRule(() => root)
    await delay(30)
    setShow(false)
    flush()
    await delay(30)
    expect(root.querySelectorAll('style').length).toBe(1)
    expect(document.head.querySelectorAll('style').length).toBe(0)
    await delay(400)
    expect(root.querySelectorAll('style').length).toBe(0)
    root.remove()
  })
})
