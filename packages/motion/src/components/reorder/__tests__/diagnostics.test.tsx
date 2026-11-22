import { afterEach, describe, expect, it, vi } from 'vitest'
import { OBSERVE, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { Reorder } from '../index'
import { nextFrames, pointerDown, pointerMove, pointerUp } from './pointer-utils'
import { cleanup, press, registerLayouts, renderGroup, tick } from './helpers'

describe('reorder: dev diagnostics', () => {
  afterEach(cleanup)

  it('mounting, dragging, keyboard reordering and removing items emit no diagnostics', async () => {
    const cap = OBSERVE!.diagnostics.capture()
    const { getByTestId, container, setItems, unmount } = await renderGroup()

    // pointer drag
    const a = getByTestId('a')
    pointerDown(a, 50, 25)
    pointerMove(50, 40)
    await nextFrames(2)
    pointerMove(50, 120)
    await nextFrames(2)
    pointerUp(50, 120)
    await tick()

    // keyboard reorder
    registerLayouts(container)
    const b = getByTestId('b')
    await press(b, ' ')
    await press(b, 'ArrowDown')
    await press(b, ' ')

    // remove, then add, items
    setItems(items => items.slice(1))
    flush()
    await tick()
    setItems(['x', ...['b', 'c']])
    flush()
    await tick()
    unmount()
    await tick()

    expect(cap.stop().map(e => `${e.code}: ${e.message}`)).toEqual([])
  })

  it('forwards a user ref to the item element', async () => {
    const ref = vi.fn()
    const { getByTestId } = await renderGroup({ itemProps: { ref } })
    expect(ref).toHaveBeenCalledTimes(3)
    expect(ref).toHaveBeenCalledWith(getByTestId('a'))
  })

  it('Reorder.Group forwards a ref through a spread without diagnostics', async () => {
    const cap = OBSERVE!.diagnostics.capture()
    const ref = vi.fn()
    const rest = () => ({ ref, 'data-testid': 'group' })
    const { getByTestId } = render(() => (
      <Reorder.Group values={['a']} onReorder={() => {}} {...rest()}>
        <Reorder.Item value="a">a</Reorder.Item>
      </Reorder.Group>
    ))
    await tick()
    expect(ref).toHaveBeenCalledWith(getByTestId('group'))
    expect(cap.stop().map(e => e.message)).toEqual([])
  })
})
