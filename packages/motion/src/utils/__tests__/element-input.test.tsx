import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@solidjs/testing-library'
import { flush } from 'solid-js'
import { createAnimate } from '@/animation/hooks/use-animate'
import { createInView } from '@/utils/use-in-view'
import { resolveElementInput } from '@/utils/use-dom-ref'
import { installIntersectionObserver, observersOf } from '@/shared/mock-intersection-observer'
import { delay } from '@/shared/test'

beforeEach(() => {
  installIntersectionObserver()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Issue #3: the scope from `createAnimate` is a function with a `current` property.
describe('resolveElementInput', () => {
  it('resolves the element of a createAnimate scope', () => {
    let scope: any
    const { container } = render(() => {
      ;[scope] = createAnimate()
      return <div ref={scope} />
    })
    flush()
    expect(scope.current).toBe(container.firstChild)
    expect(resolveElementInput(scope)).toBe(container.firstChild)
  })

  it('still resolves elements, accessors, accessors of boxes and plain { current } objects', () => {
    const el = document.createElement('div')
    expect(resolveElementInput(el)).toBe(el)
    expect(resolveElementInput(() => el)).toBe(el)
    expect(resolveElementInput({ current: el })).toBe(el)
    expect(resolveElementInput(() => ({ current: el }) as any)).toBe(el)
    expect(resolveElementInput({ current: null })).toBeUndefined()
    expect(resolveElementInput(() => undefined)).toBeUndefined()
  })

  it('createInView accepts the createAnimate scope', async () => {
    let seen: Element | undefined
    render(() => {
      const [scope] = createAnimate()
      createInView(scope)
      return <div data-testid="el" ref={scope} />
    })
    flush()
    await delay(30)
    const el = document.querySelector('[data-testid="el"]')!
    seen = el
    expect(observersOf(seen)).toHaveLength(1)
  })
})
