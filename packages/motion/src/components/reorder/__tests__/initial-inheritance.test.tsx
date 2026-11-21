import { render } from '@solidjs/testing-library'
import { For, createSignal } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { Motion } from '@/components/motion'
import { Reorder } from '../index'
import { tick } from './helpers'

/**
 * Issue #276 (motion-vue): absent motion props on Reorder.Group / Reorder.Item must stay
 * undefined, not fall to `false`, so items with only `variants` inherit `initial` and play
 * the initial animation.
 */
describe('reorder.Group prop defaults (#276)', () => {
  it('items with only variants inherit initial and play the initial animation', async () => {
    const parentVariants = { hidden: {}, visible: {} }
    const itemVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 1 } },
    }
    const [items, setItems] = createSignal([1, 2, 3])

    const { getByTestId } = render(() => (
      <Motion initial="hidden" animate="visible" variants={parentVariants}>
        <Reorder.Group values={items()} onReorder={setItems}>
          <For each={items()}>
            {item => (
              <Reorder.Item value={item} variants={itemVariants} data-testid={`reorder-item-${item}`}>
                Item {item}
              </Reorder.Item>
            )}
          </For>
        </Reorder.Group>
      </Motion>
    ))
    await tick()

    // First render must resolve from the inherited `hidden` variant
    expect(getByTestId('reorder-item-1').getAttribute('style')).toContain('opacity: 0')

    // The initial animation runs towards the inherited `visible` variant
    await new Promise(resolve => setTimeout(resolve, 100))
    const midOpacity = Number.parseFloat(getByTestId('reorder-item-1').style.opacity)
    expect(midOpacity).toBeGreaterThan(0)
    expect(midOpacity).toBeLessThan(1)
  })
})
