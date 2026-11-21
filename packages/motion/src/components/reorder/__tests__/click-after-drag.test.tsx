import { render } from '@solidjs/testing-library'
import { For, createSignal } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Reorder } from '../index'
import { nextFrames, pointerDown, pointerMove, pointerUp } from './pointer-utils'
import { ContextCapture, cleanup, getContext, tick } from './helpers'

/**
 * framer-motion #2682: the pointer release that ends a reordering drag must
 * not fire a click on the item under it.
 */
describe('reorder: click after drag', () => {
  afterEach(cleanup)

  async function setup() {
    const handlers = {
      onReorder: vi.fn(),
      onGroupClick: vi.fn(),
      onItemClick: vi.fn(),
      onChildClick: vi.fn(),
    }
    const [items, setItems] = createSignal(['a', 'b'])
    const wrapper = render(() => (
      <Reorder.Group
        values={items()}
        onReorder={(newOrder: string[], moved: string) => {
          handlers.onReorder(newOrder, moved)
          setItems(newOrder)
        }}
        axis="y"
        data-testid="group"
        onClick={handlers.onGroupClick}
      >
        <ContextCapture />
        <For each={items()}>
          {item => (
            <Reorder.Item value={item} data-testid={item} onClick={handlers.onItemClick}>
              <button data-testid={`${item}-child`} onClick={handlers.onChildClick} />
            </Reorder.Item>
          )}
        </For>
      </Reorder.Group>
    ))
    await tick()

    // jsdom has no layout, so give the items one
    getContext().registerItem!('a', { x: { min: 0, max: 100 }, y: { min: 0, max: 50 } })
    getContext().registerItem!('b', { x: { min: 0, max: 100 }, y: { min: 50, max: 100 } })

    return { ...handlers, ...wrapper }
  }

  async function reorderDrag(element: Element) {
    pointerDown(element, 50, 25)
    pointerMove(50, 40)
    await nextFrames(2)
    pointerMove(50, 100)
    await nextFrames(2)
    pointerUp(50, 100)
  }

  // A pointer-generated click, which browsers fire straight after pointerup
  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
  }

  it.each(['a', 'a-child'])('doesn\'t click %s on the release that ends a reordering drag', async (target) => {
    const { onReorder, onGroupClick, onItemClick, onChildClick, getByTestId } = await setup()

    // Press where the click will land, so it's a descendant of the press
    pointerDown(getByTestId(target), 50, 25)
    pointerMove(50, 40)
    await nextFrames(2)
    pointerMove(50, 100)
    await nextFrames(2)
    pointerUp(50, 100)
    expect(onReorder).toHaveBeenCalledWith(['b', 'a'], 'a')

    click(getByTestId(target))
    expect(onItemClick).not.toHaveBeenCalled()
    expect(onChildClick).not.toHaveBeenCalled()
    expect(onGroupClick).not.toHaveBeenCalled()
  })

  it('clicks after a drag that doesn\'t reorder', async () => {
    const { onReorder, onItemClick, onGroupClick, getByTestId } = await setup()

    pointerDown(getByTestId('a'), 50, 25)
    pointerMove(150, 25)
    await nextFrames(2)
    pointerUp(150, 25)
    expect(onReorder).not.toHaveBeenCalled()

    click(getByTestId('a'))
    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onGroupClick).toHaveBeenCalledTimes(1)
  })

  it('clicks as normal once the drag has ended', async () => {
    const { onItemClick, getByTestId } = await setup()

    await reorderDrag(getByTestId('a'))
    await nextFrames(1)

    click(getByTestId('a'))
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('clicks as normal on the next press', async () => {
    const { onItemClick, getByTestId } = await setup()

    await reorderDrag(getByTestId('a'))
    pointerDown(getByTestId('b'), 50, 75)
    pointerUp(50, 75)

    click(getByTestId('b'))
    expect(onItemClick).toHaveBeenCalledTimes(1)
  })

  it('fires clicks with no pointer press behind them', async () => {
    const { onChildClick, getByTestId } = await setup()

    await reorderDrag(getByTestId('a'))

    // e.g. Enter on a focused button
    ;(getByTestId('a-child') as HTMLElement).click()
    expect(onChildClick).toHaveBeenCalledTimes(1)
  })
})
