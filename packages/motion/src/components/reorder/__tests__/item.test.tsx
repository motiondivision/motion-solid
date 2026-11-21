import { render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'
import { mountedStates } from '@/state'
import { Reorder } from '../index'
import { ReorderGroup, ReorderItem } from '../index'
import { cleanup, press, tick } from './helpers'

describe('Reorder.Item / Reorder.Group', () => {
  afterEach(cleanup)

  it('exposes Group and Item on the Reorder namespace', () => {
    expect(Reorder.Group).toBe(ReorderGroup)
    expect(Reorder.Item).toBe(ReorderItem)
  })

  it('throws a named error when an item is rendered outside a group', () => {
    expect(() => render(() => <Reorder.Item value="a" />)).toThrow(/Reorder\.Item must be a descendant of Reorder\.Group/)
  })

  it('renders ul and li by default, and honours `as`', () => {
    const { container } = render(() => (
      <Reorder.Group values={['a']} onReorder={() => {}}>
        <Reorder.Item value="a" />
      </Reorder.Group>
    ))
    expect(container.querySelector('ul > li')).not.toBeNull()

    const other = render(() => (
      <Reorder.Group as="div" values={['a']} onReorder={() => {}}>
        <Reorder.Item as="section" value="a" />
      </Reorder.Group>
    ))
    expect(other.container.querySelector('div > section')).not.toBeNull()
  })

  it('keeps overflow-anchor: none on the group alongside a user style', () => {
    const { container } = render(() => (
      <Reorder.Group values={[]} onReorder={() => {}} style={{ color: 'red' }} />
    ))
    const ul = container.querySelector('ul')!
    expect(ul.style.overflowAnchor).toBe('none')
    expect(ul.style.color).toBe('red')
  })

  it('forwards user refs to the group and item elements', () => {
    let groupEl: HTMLElement | undefined
    let itemEl: HTMLElement | undefined
    const { container } = render(() => (
      <Reorder.Group values={['a']} onReorder={() => {}} ref={(el: HTMLElement) => (groupEl = el)}>
        <Reorder.Item value="a" ref={(el: HTMLElement) => (itemEl = el)} />
      </Reorder.Group>
    ))
    expect(groupEl).toBe(container.querySelector('ul'))
    expect(itemEl).toBe(container.querySelector('li'))
  })

  it('gives children the drag state, which follows a keyboard grab', async () => {
    const { getByTestId } = render(() => (
      <Reorder.Group values={['a']} onReorder={() => {}}>
        <Reorder.Item value="a" data-testid="a">
          {({ isDragging }) => <span>{isDragging() ? 'dragging' : 'idle'}</span>}
        </Reorder.Item>
      </Reorder.Group>
    ))
    await tick()
    expect(getByTestId('a').textContent).toBe('idle')
    await press(getByTestId('a'), ' ')
    expect(getByTestId('a').textContent).toBe('dragging')
    await press(getByTestId('a'), ' ')
    expect(getByTestId('a').textContent).toBe('idle')
  })

  it('sets the drag axis on items from the group axis and lets items override it', async () => {
    const [axis, setAxis] = createSignal<'x' | 'y' | 'xy'>('y')
    const { getByTestId } = render(() => (
      <Reorder.Group values={['a', 'b']} onReorder={() => {}} axis={axis()}>
        <Reorder.Item value="a" data-testid="a" />
        <Reorder.Item value="b" data-testid="b" drag="x" />
      </Reorder.Group>
    ))
    await tick()
    const dragOf = (id: string) => mountedStates.get(getByTestId(id))?.options.drag
    expect(dragOf('a')).toBe('y')
    expect(dragOf('b')).toBe('x')
    setAxis('x')
    await tick()
    expect(dragOf('a')).toBe('x')
    setAxis('xy')
    await tick()
    expect(dragOf('a')).toBe(true)
    expect(dragOf('b')).toBe('x')
  })

  it('throws when the group has no values', () => {
    expect(() => render(() => <Reorder.Group values={undefined as any} onReorder={() => {}} />)).toThrow(/values prop/)
  })
})

describe('Reorder array refs', () => {
  afterEach(cleanup)

  it('forwards array refs on Group and Item', () => {
    const calls: string[] = []
    const { container } = render(() => (
      <Reorder.Group values={[1]} onReorder={() => {}} ref={[() => calls.push('ga'), () => calls.push('gb')] as any}>
        <Reorder.Item value={1} ref={[() => calls.push('ia'), () => calls.push('ib')] as any}>x</Reorder.Item>
      </Reorder.Group>
    ))
    flush()
    expect(container.querySelector('ul > li')).not.toBeNull()
    expect(calls.sort()).toEqual(['ga', 'gb', 'ia', 'ib'])
  })
})
