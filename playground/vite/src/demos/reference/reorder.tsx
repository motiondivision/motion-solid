import { createSignal, For } from 'solid-js'
import { Reorder } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'reorder',
  title: 'Reorder',
  group: 'reference',
  description: 'Drag list items vertically to reorder them; the order is mirrored in the readout.',
  covers: ['Reorder'],
} as const

export default function Demo() {
  const [items, setItems] = createSignal(['Apple', 'Banana', 'Cherry', 'Date'])

  return (
    <>
      <Controls>
        <Readout label="order" value={items().join(', ')} />
      </Controls>
      <Stage>
        <Reorder.Group class="reorder" values={items()} onReorder={setItems}>
          <For each={items()}>
            {item => <Reorder.Item value={item}>{item}</Reorder.Item>}
          </For>
        </Reorder.Group>
      </Stage>
    </>
  )
}
