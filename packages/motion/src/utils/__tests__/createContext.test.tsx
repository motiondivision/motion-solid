import { describe, expect, test } from 'vitest'
import { render } from '@solidjs/testing-library'
import { createContext } from '../createContext'

describe('createContext', () => {
  test('returns the provided value', () => {
    const [useCtx, Ctx] = createContext<{ n: number }>('Thing')
    let seen: { n: number } | undefined
    function Child() {
      seen = useCtx()
      return null
    }
    render(() => <Ctx value={{ n: 3 }}><Child /></Ctx>)
    expect(seen).toEqual({ n: 3 })
  })

  test('throws a named error without provider, fallback or default', () => {
    const [useCtx] = createContext<number>('Thing')
    expect(() => render(() => { useCtx(); return null })).toThrow(/ThingContext not found.*`Thing`/)
  })

  test('lists several provider names', () => {
    const [useCtx] = createContext<number>(['A', 'B'])
    expect(() => render(() => { useCtx(); return null })).toThrow(/one of the following components: A, B/)
  })

  test('null fallback opts out of throwing', () => {
    const [useCtx] = createContext<number>('Thing')
    let seen: number | null | undefined
    render(() => { seen = useCtx(null); return null })
    expect(seen).toBeNull()
  })

  test('value fallback and default are used without a provider; fallback wins over default', () => {
    const [useCtx] = createContext<number>('Thing', 1)
    const seen: number[] = []
    render(() => { seen.push(useCtx(), useCtx(2)); return null })
    expect(seen).toEqual([1, 2])
  })

  test('nested providers resolve to the nearest', () => {
    const [useCtx, Ctx] = createContext<string>('Thing')
    let seen = ''
    function Child() {
      seen = useCtx()
      return null
    }
    render(() => <Ctx value="outer"><Ctx value="inner"><Child /></Ctx></Ctx>)
    expect(seen).toBe('inner')
  })
})
