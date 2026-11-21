import { describe, expect, test } from 'vitest'
import { createMemo, createRoot, createSignal, flush } from 'solid-js'
import { resolveMotionProps } from '../resolve-motion-props'

const base = { layoutGroup: {}, presenceContext: {}, config: {} }

describe('resolveMotionProps', () => {
  test('prefixes layoutId with the group id', () => {
    expect(resolveMotionProps({ layoutId: 'a' }, { ...base, layoutGroup: { id: 'g' } }).layoutId).toBe('g-a')
    expect(resolveMotionProps({ layoutId: 'a' }, base).layoutId).toBe('a')
    expect(resolveMotionProps({}, { ...base, layoutGroup: { id: 'g' } }).layoutId).toBeUndefined()
  })

  test('falls back to config transition and inViewOptions', () => {
    const config = { transition: { duration: 2 }, inViewOptions: { once: true } }
    const r = resolveMotionProps({}, { ...base, config })
    expect(r.transition).toEqual({ duration: 2 })
    expect(r.inViewOptions).toEqual({ once: true })
    expect(r.motionConfig).toBe(config)
    expect(resolveMotionProps({ transition: { duration: 1 } }, { ...base, config }).transition).toEqual({ duration: 1 })
  })

  test('initial: presence false wins, true becomes undefined', () => {
    expect(resolveMotionProps({ initial: { opacity: 0 } }, { ...base, presenceContext: { initial: false } }).initial).toBe(false)
    expect(resolveMotionProps({ initial: true }, base).initial).toBeUndefined()
    expect(resolveMotionProps({ initial: false }, base).initial).toBe(false)
    expect(resolveMotionProps({ initial: { opacity: 0 } }, base).initial).toEqual({ opacity: 0 })
  })

  test('maps React tap/viewport aliases, internal names win', () => {
    const onTap = () => {}
    const onPress = () => {}
    const r = resolveMotionProps({ whileTap: { scale: 0.9 }, onTap, onTapStart: onTap, globalTapTarget: true, viewport: { once: true } }, base)
    expect(r.whilePress).toEqual({ scale: 0.9 })
    expect(r.onPress).toBe(onTap)
    expect(r.onPressStart).toBe(onTap)
    expect(r.globalPressTarget).toBe(true)
    expect(r.inViewOptions).toEqual({ once: true })
    expect('whileTap' in r).toBe(false)
    expect(resolveMotionProps({ onTap, onPress }, base).onPress).toBe(onPress)
  })

  test('accepts accessors and re-runs inside a tracking scope', () => {
    const [group, setGroup] = createSignal({ id: 'a' })
    const [config] = createSignal({ transition: { duration: 3 } })
    let m!: () => ReturnType<typeof resolveMotionProps>
    createRoot(() => {
      m = createMemo(() => resolveMotionProps({ layoutId: 'x' }, { layoutGroup: group, presenceContext: {}, config }))
    })
    expect(m().layoutId).toBe('a-x')
    expect(m().transition).toEqual({ duration: 3 })
    setGroup({ id: 'b' }); flush()
    expect(m().layoutId).toBe('b-x')
  })
})
