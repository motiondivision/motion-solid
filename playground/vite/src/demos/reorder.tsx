import { createSignal, For } from 'solid-js'
import { Reorder } from 'motion-solid'

export function ReorderDemo() {
  const [items, setItems] = createSignal(['Apple', 'Banana', 'Cherry', 'Date'])

  return (
    <section>
      <h2>Reorder</h2>
      <Reorder.Group class="reorder" values={items()} onReorder={setItems}>
        <For each={items()}>
          {item => <Reorder.Item value={item}>{item}</Reorder.Item>}
        </For>
      </Reorder.Group>
    </section>
  )
}
