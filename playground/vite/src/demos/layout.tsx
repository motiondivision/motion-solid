import { createSignal, For, Show } from 'solid-js'
import { LayoutGroup, motion } from 'motion-solid'

const tabs = ['Home', 'Work', 'About']

export function LayoutDemo() {
  const [selected, setSelected] = createSignal(0)
  const [expanded, setExpanded] = createSignal(false)

  return (
    <section>
      <h2>layout / layoutId</h2>
      <LayoutGroup>
        <div class="tabs">
          <For each={tabs}>
            {(tab, index) => (
              <button onClick={() => setSelected(index())}>
                {tab}
                <Show when={selected() === index()}>
                  <motion.div class="underline" layoutId="underline" />
                </Show>
              </button>
            )}
          </For>
        </div>
      </LayoutGroup>
      <div style={{ 'margin-top': '32px' }}>
        <motion.div
          layout
          class="box"
          style={{ width: expanded() ? '300px' : '100px' }}
          onClick={() => setExpanded(value => !value)}
        />
      </div>
    </section>
  )
}
