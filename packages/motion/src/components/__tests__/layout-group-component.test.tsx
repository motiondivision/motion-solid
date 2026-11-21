import { render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { useLayoutGroupContext } from '../context'
import { LayoutGroup } from '../LayoutGroup'

describe('LayoutGroup', () => {
  function capture() {
    const seen: Record<string, ReturnType<typeof useLayoutGroupContext>> = {}
    const Probe = (props: { name: string }) => {
      seen[props.name] = useLayoutGroupContext()
      return null
    }
    return { seen, Probe }
  }

  it('renders its children and provides its id', () => {
    const { seen, Probe } = capture()
    const { container } = render(() => (
      <LayoutGroup id="g">
        <span>child</span>
        <Probe name="g" />
      </LayoutGroup>
    ))
    expect(container.textContent).toBe('child')
    expect(seen.g.id).toBe('g')
    expect(seen.g.group).toBeDefined()
    expect(typeof seen.g.forceRender).toBe('function')
    expect(seen.g.key!()).toBe(0)
  })

  it('inherits the parent id and group by default, and not when inherit is false', () => {
    const { seen, Probe } = capture()
    render(() => (
      <LayoutGroup id="outer">
        <Probe name="outer" />
        <LayoutGroup id="inner">
          <Probe name="inherits" />
        </LayoutGroup>
        <LayoutGroup id="inner" inherit={false}>
          <Probe name="isolated" />
        </LayoutGroup>
        <LayoutGroup id="inner" inherit="id">
          <Probe name="id-only" />
        </LayoutGroup>
      </LayoutGroup>
    ))
    expect(seen.inherits.id).toBe('outer-inner')
    expect(seen.inherits.group).toBe(seen.outer.group)
    expect(seen.isolated.id).toBe('inner')
    expect(seen.isolated.group).not.toBe(seen.outer.group)
    expect(seen['id-only'].id).toBe('outer-inner')
    expect(seen['id-only'].group).not.toBe(seen.outer.group)
  })

  it('follows id changes and bumps its key on forceRender', () => {
    const { seen, Probe } = capture()
    const [id, setId] = createSignal('a')
    render(() => (
      <LayoutGroup id={id()}>
        <Probe name="g" />
      </LayoutGroup>
    ))
    expect(seen.g.id).toBe('a')
    setId('b')
    flush()
    expect(seen.g.id).toBe('b')

    seen.g.forceRender!()
    flush()
    expect(seen.g.key!()).toBe(1)
  })
})
