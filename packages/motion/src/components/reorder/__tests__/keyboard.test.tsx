import { render } from '@solidjs/testing-library'
import { For, createSignal } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'
import { Reorder } from '../index'
import { ContextCapture, cleanup, focused, press, registerGridLayouts, registerLayouts, renderGroup, tick } from './helpers'

describe('reorder keyboard focus', () => {
  afterEach(cleanup)

  it('puts one item in the tab order, the first until one is focused', async () => {
    const { container, getByTestId } = await renderGroup()
    const tabIndexes = () =>
      Array.from(container.querySelectorAll('li')).map(li => (li as HTMLElement).tabIndex)
    expect(tabIndexes()).toEqual([0, -1, -1])

    ;(getByTestId('c') as HTMLElement).focus()
    await tick()
    expect(tabIndexes()).toEqual([-1, -1, 0])

    // Focus inside an item makes it the one in the tab order
    ;(getByTestId('b-input') as HTMLElement).focus()
    await tick()
    expect(tabIndexes()).toEqual([-1, 0, -1])
  })

  it('lets items override tabIndex', async () => {
    const { getByTestId } = await renderGroup({ initial: ['a'], itemProps: { tabindex: -1 } })
    expect(getByTestId('a').tabIndex).toBe(-1)
  })

  it('makes the first rendered item the tab stop', async () => {
    const [values, setValues] = createSignal(['a', 'b', 'c'])
    const { getByTestId } = render(() => (
      <Reorder.Group values={values()} onReorder={() => {}}>
        <Reorder.Item value="b" data-testid="b" />
        <Reorder.Item value="c" data-testid="c" />
        <Reorder.Item value="new" data-testid="new" />
      </Reorder.Group>
    ))
    // "a" isn't rendered (e.g. virtualized), and "new" isn't in values
    await tick()
    expect(getByTestId('b').tabIndex).toBe(0)
    expect(getByTestId('c').tabIndex).toBe(-1)
    expect(getByTestId('new').tabIndex).toBe(0)

    // The focused item stays the tab stop until it's unrendered
    ;(getByTestId('c') as HTMLElement).focus()
    await tick()
    setValues(['a', 'b', 'c', 'new'])
    await tick()
    expect(getByTestId('b').tabIndex).toBe(-1)
    expect(getByTestId('c').tabIndex).toBe(0)
    expect(getByTestId('new').tabIndex).toBe(-1)
  })

  it('moves the tab stop on when its item is unrendered below the group', async () => {
    const [shown, setShown] = createSignal(['a', 'b', 'c'])
    const { getByTestId } = render(() => (
      <Reorder.Group values={['a', 'b', 'c']} onReorder={() => {}}>
        <For each={shown()}>{value => <Reorder.Item value={value} data-testid={value} />}</For>
      </Reorder.Group>
    ))
    await tick()
    expect(getByTestId('a').tabIndex).toBe(0)

    setShown(['b', 'c'])
    await tick()
    expect(getByTestId('b').tabIndex).toBe(0)
  })

  it('keeps the tab stop when an item outside values is focused', async () => {
    const { getByTestId } = render(() => (
      <Reorder.Group values={['a', 'b']} onReorder={() => {}}>
        <Reorder.Item value="a" data-testid="a" />
        <Reorder.Item value="b" data-testid="b" />
        <Reorder.Item value="new" data-testid="new" />
      </Reorder.Group>
    ))
    await tick()
    ;(getByTestId('b') as HTMLElement).focus()
    await tick()
    ;(getByTestId('new') as HTMLElement).focus()
    await tick()
    expect(getByTestId('a').tabIndex).toBe(-1)
    expect(getByTestId('b').tabIndex).toBe(0)
  })

  it('moves focus past values that are not rendered', async () => {
    const [shown, setShown] = createSignal(['a', 'b', 'c'])
    const { container, getByTestId } = render(() => (
      <Reorder.Group values={['a', 'b', 'c']} onReorder={() => {}}>
        <ContextCapture />
        <For each={shown()}>{value => <Reorder.Item value={value} data-testid={value} />}</For>
      </Reorder.Group>
    ))
    await tick()
    registerLayouts(container)
    // b has been measured, then unrendered
    setShown(['a', 'c'])
    await tick()
    ;(getByTestId('a') as HTMLElement).focus()
    await press(getByTestId('a'), 'ArrowDown')
    expect(focused()).toBe('c')
  })

  it('moves focus with arrows until an item is grabbed', async () => {
    const { getByTestId, onReorder } = await renderGroup()
    const a = getByTestId('a') as HTMLElement
    a.focus()
    await tick()

    expect(await press(a, 'ArrowDown')).toBe(false)
    expect(focused()).toBe('b')
    expect(getByTestId('b').tabIndex).toBe(0)
    expect(getByTestId('a').tabIndex).toBe(-1)

    await press(getByTestId('b'), 'ArrowDown')
    expect(focused()).toBe('c')
    // Nothing past the end, and arrows across the axis are the browser's
    expect(await press(getByTestId('c'), 'ArrowDown')).toBe(false)
    expect(focused()).toBe('c')
    expect(await press(getByTestId('c'), 'ArrowLeft')).toBe(true)

    await press(getByTestId('c'), 'ArrowUp')
    expect(focused()).toBe('b')
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('leaves Escape to the browser when nothing is grabbed', async () => {
    const { getByTestId } = await renderGroup()
    expect(await press(getByTestId('a'), 'Escape')).toBe(true)
  })

  it('moves focus by row in a grid', async () => {
    const { container, getByTestId } = await renderGroup({
      axis: 'xy',
      initial: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    })
    // a b c
    // d e f
    // g h
    registerGridLayouts(container)
    const e = getByTestId('e') as HTMLElement
    e.focus()
    await tick()

    registerGridLayouts(container)
    expect(await press(e, 'ArrowUp')).toBe(false)
    expect(focused()).toBe('b')

    registerGridLayouts(container)
    await press(getByTestId('b'), 'ArrowDown')
    expect(focused()).toBe('e')

    registerGridLayouts(container)
    await press(e, 'ArrowDown')
    expect(focused()).toBe('h')

    // Nothing below the last row
    registerGridLayouts(container)
    expect(await press(getByTestId('h'), 'ArrowDown')).toBe(false)
    expect(focused()).toBe('h')

    // Left and Right still move one place
    registerGridLayouts(container)
    await press(getByTestId('h'), 'ArrowLeft')
    expect(focused()).toBe('g')
  })
})
