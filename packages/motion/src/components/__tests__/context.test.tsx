import { describe, expect, test } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { LayoutGroupContext, MotionContext, useLayoutGroupContext, useMotionContext } from '../context'
import { MotionConfigContext, defaultConfig, useMotionConfig } from '../motion-config/context'
import { AnimatePresenceContext, useAnimatePresenceContext } from '../animate-presence/presence'
import { LazyMotionContext, useLazyMotionContext } from '../lazy-motion/context'
import { ReorderContext, useReorderContext } from '../reorder/context'
import type { MotionState } from '@/state/motion-state'

function probe<T>(read: () => T) {
  let out!: T
  return { Child: () => { out = read(); return null }, get: () => out }
}

describe('context modules', () => {
  test('useMotionContext is null at the root and the state under a provider', () => {
    const root = probe(() => useMotionContext())
    render(() => <root.Child />)
    expect(root.get()).toBeNull()

    const state = { id: 'state' } as unknown as MotionState
    const nested = probe(() => useMotionContext())
    render(() => <MotionContext value={state}><nested.Child /></MotionContext>)
    expect(nested.get()).toBe(state)
  })

  test('useLayoutGroupContext has an inert default and key accessor', () => {
    const p = probe(() => useLayoutGroupContext())
    render(() => <p.Child />)
    expect(p.get().id).toBeUndefined()
    expect(p.get().key!()).toBe(0)
    expect(() => p.get().forceRender!()).not.toThrow()
  })

  test('layout group key accessor is reactive through the provider', () => {
    const [key, setKey] = createSignal(0)
    const p = probe(() => useLayoutGroupContext())
    render(() => (
      <LayoutGroupContext value={{ id: 'g', key }}>
        <p.Child />
      </LayoutGroupContext>
    ))
    expect(p.get().id).toBe('g')
    setKey(5); flush()
    expect(p.get().key!()).toBe(5)
  })

  test('useMotionConfig returns an accessor, default config outside provider', () => {
    const p = probe(() => useMotionConfig())
    render(() => <p.Child />)
    expect(p.get()()).toBe(defaultConfig)

    const [cfg] = createSignal({ reducedMotion: 'always' as const })
    const q = probe(() => useMotionConfig())
    render(() => <MotionConfigContext value={cfg}><q.Child /></MotionConfigContext>)
    expect(q.get()().reducedMotion).toBe('always')
  })

  test('presence context: empty default, null opt-out, provided value', () => {
    const p = probe(() => [useAnimatePresenceContext(), useAnimatePresenceContext(null)] as const)
    render(() => <p.Child />)
    expect(p.get()[0]).toEqual({})
    expect(p.get()[1]).toBeNull()

    const value = { initial: false, custom: 1 }
    const q = probe(() => useAnimatePresenceContext())
    render(() => <AnimatePresenceContext value={value}><q.Child /></AnimatePresenceContext>)
    expect(q.get()).toBe(value)
  })

  test('lazy motion context: default empty bundle, strict flag, provided', () => {
    const p = probe(() => [useLazyMotionContext(), useLazyMotionContext(null)] as const)
    render(() => <p.Child />)
    expect(p.get()[0].features()).toEqual({})
    expect(p.get()[0].strict).toBe(false)
    expect(p.get()[1]).toBeNull()

    const features = () => ({ features: [] })
    const q = probe(() => useLazyMotionContext())
    render(() => <LazyMotionContext value={{ features, strict: true }}><q.Child /></LazyMotionContext>)
    expect(q.get().strict).toBe(true)
    expect(q.get().features()).toEqual({ features: [] })
  })

  test('reorder context throws outside a group, resolves inside', () => {
    const p = probe(() => useReorderContext())
    expect(() => render(() => <p.Child />)).toThrow(/ReorderGroupContext not found/)

    const value = { axis: () => 'y' as const }
    const q = probe(() => useReorderContext())
    render(() => <ReorderContext value={value}><q.Child /></ReorderContext>)
    expect(q.get().axis!()).toBe('y')
  })
})
