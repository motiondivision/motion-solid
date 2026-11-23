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

  // Issue #4: a plain accessor or { current } is not reactive, so it has to be read again after mount.
  it('resolves a plain () => el accessor assigned by ref after mount', () => {
    vi.mocked(scopeMotion).mockImplementation((() => ({ cancel: vi.fn() })) as any)
    let el: HTMLElement | undefined
    const { container } = render(() => {
      createScopeMotion(() => el, () => {})
      return <div ref={(e: HTMLElement) => { el = e }} />
    })
    flush()
    const roots = vi.mocked(scopeMotion).mock.calls.map(call => call[0])
    expect(roots.at(-1)).toBe(container.firstChild)
  })

  it('resolves a { current } object assigned by ref after mount', () => {
    vi.mocked(scopeMotion).mockImplementation((() => ({ cancel: vi.fn() })) as any)
    const box: { current: HTMLElement | undefined } = { current: undefined }
    const { container } = render(() => {
      createScopeMotion(box as any, () => {})
      return <div ref={(e: HTMLElement) => { box.current = e }} />
    })
    flush()
    expect(vi.mocked(scopeMotion).mock.calls.at(-1)![0]).toBe(container.firstChild)
  })

  it('cancels the scope created before the element was known', () => {
    const first = { cancel: vi.fn() }
    const second = { cancel: vi.fn() }
    vi.mocked(scopeMotion).mockReturnValueOnce(first as any).mockReturnValueOnce(second as any)
    let el: HTMLElement | undefined
    const { unmount } = render(() => {
      createScopeMotion(() => el, () => {})
      return <div ref={(e: HTMLElement) => { el = e }} />
    })
    flush()
    expect(first.cancel).toHaveBeenCalledTimes(1)
    unmount()
    flush()
    expect(second.cancel).toHaveBeenCalledTimes(1)
  })
})
