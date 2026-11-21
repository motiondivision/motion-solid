import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { scopeMotion } from 'motion-dom'
import { createScopeMotion } from '../use-scope-motion'
import { createDomRef } from '@/utils/use-dom-ref'

vi.mock('motion-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion-dom')>()
  return { ...actual, scopeMotion: vi.fn() }
})

describe('createScopeMotion', () => {
  afterEach(() => vi.mocked(scopeMotion).mockReset())

  it('scopes setup to the element and cancels on option changes and unmount', () => {
    const setup = vi.fn()
    const [options, setOptions] = createSignal({ transition: { duration: 1 } })
    const scopes: Array<{ cancel: ReturnType<typeof vi.fn> }> = []
    vi.mocked(scopeMotion).mockImplementation(((_root: Element, run: typeof setup) => {
      const current = { cancel: vi.fn() }
      scopes.push(current)
      run(current)
      return current
    }) as any)

    let returned!: ReturnType<typeof createScopeMotion>
    const { container, unmount } = render(() => {
      const [el, ref] = createDomRef()
      returned = createScopeMotion(el, setup, options)
      return <div ref={ref} />
    })
    flush()

    expect(scopeMotion).toHaveBeenCalledTimes(1)
    expect(scopeMotion).toHaveBeenCalledWith(container.firstChild, setup, { transition: { duration: 1 } })
    expect(setup).toHaveBeenCalledWith(scopes[0])
    expect(returned()).toBe(scopes[0])

    setOptions({ transition: { duration: 2 } })
    flush()
    expect(scopes[0].cancel).toHaveBeenCalledOnce()
    expect(returned()).toBe(scopes[1])

    unmount()
    expect(scopes[1].cancel).toHaveBeenCalledOnce()
  })
})
