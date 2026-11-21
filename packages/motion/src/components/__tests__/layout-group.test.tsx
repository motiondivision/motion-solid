import { describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { LayoutGroupContext, useLayoutGroupContext } from '@/components/context'
import { createLayoutGroup, createLayoutGroupProvider } from '@/components/use-layout-group'
import { createForceUpdate } from '@/components/use-force-update'
import { createDomRef, getMotionElement } from '@/utils/use-dom-ref'
import { Motion } from '@/components/motion'
import { mountedStates } from '@/state'

function Group(props: { id?: string, inherit?: boolean | 'id' | 'group', children?: any }) {
  const state = createLayoutGroupProvider(props)
  return <LayoutGroupContext value={state}>{props.children}</LayoutGroupContext>
}

describe('createLayoutGroupProvider', () => {
  it('provides the id and a stable group, inheriting per the inherit option', () => {
    const seen: Record<string, ReturnType<typeof useLayoutGroupContext>> = {}
    function Probe(props: { name: string }) {
      seen[props.name] = useLayoutGroupContext()
      return null
    }
    render(() => (
      <Group id="outer">
        <Probe name="outer" />
        <Group id="inner" inherit>
          <Probe name="inherit" />
        </Group>
        <Group id="inner" inherit="id">
          <Probe name="id" />
        </Group>
        <Group id="inner">
          <Probe name="none" />
        </Group>
      </Group>
    ))
    expect(seen.outer.id).toBe('outer')
    expect(seen.inherit.id).toBe('outer-inner')
    expect(seen.inherit.group).toBe(seen.outer.group)
    expect(seen.id.id).toBe('outer-inner')
    expect(seen.id.group).not.toBe(seen.outer.group)
    expect(seen.none.id).toBe('inner')
    expect(seen.none.group).not.toBe(seen.outer.group)
  })

  it('prefixes layoutId with the group id on motion components and follows id changes', () => {
    const [id, setId] = createSignal('a')
    const { container } = render(() => (
      <Group id={id()}>
        <Motion layoutId="box" />
      </Group>
    ))
    const state = mountedStates.get(container.firstElementChild!)!
    expect(state.options.layoutId).toBe('a-box')
    setId('b')
    flush()
    expect(state.options.layoutId).toBe('b-box')
  })

  it('forceRender bumps key', () => {
    let ctx!: ReturnType<typeof useLayoutGroupContext>
    function Probe() {
      ctx = useLayoutGroupContext()
      return null
    }
    render(() => <Group><Probe /></Group>)
    const before = ctx.key!()
    ctx.forceRender!()
    flush()
    expect(ctx.key!()).toBe(before + 1)
  })

  it('createLayoutGroup returns a no-op forceRender outside a group', () => {
    let fr!: VoidFunction
    function Probe() {
      fr = createLayoutGroup().forceRender
      return null
    }
    render(() => <Probe />)
    expect(() => fr()).not.toThrow()
  })
})

describe('createForceUpdate', () => {
  it('increments the key on each call', () => {
    let fn!: VoidFunction
    let key!: () => number
    render(() => {
      ;[fn, key] = createForceUpdate()
      return null
    })
    expect(key()).toBe(0)
    fn()
    fn()
    flush()
    expect(key()).toBe(2)
  })
})

describe('motion element helpers', () => {
  it('getMotionElement skips text and comment nodes', () => {
    const host = document.createElement('div')
    host.append(document.createTextNode('t'), document.createComment('c'))
    const target = document.createElement('span')
    host.append(target)
    expect(getMotionElement(host.firstChild)).toBe(target)
    expect(getMotionElement(null)).toBeUndefined()
  })

  it('createDomRef exposes the element after the ref is set', () => {
    let element!: ReturnType<typeof createDomRef>[0]
    const { container } = render(() => {
      const [el, ref] = createDomRef()
      element = el
      return <div ref={ref} />
    })
    flush()
    expect(element()).toBe(container.firstElementChild)
  })
})
