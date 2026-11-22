import { createSignal, For, Show } from 'solid-js'
import { LayoutGroup, motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'layout',
  title: 'layout / layoutId',
  group: 'reference',
  description: 'A shared-layout tab underline (layoutId) and a layout-animated box whose width toggles on click.',
  covers: ['LayoutGroup', 'motion'],
} as const

const tabs = ['Home', 'Work', 'About']

export default function Demo() {
  const [selected, setSelected] = createSignal(0)
  const [expanded, setExpanded] = createSignal(false)

  return (
    <>
      <Controls>
        <Readout label="tab" value={tabs[selected()]} />
        <Readout label="box width (state)" value={expanded() ? '300px' : '100px'} />
      </Controls>
      <Stage height="260px">
        <div>
          <LayoutGroup>
            <div class="tabs">
              <For each={tabs}>
                {(tab, index) => (
                  <button type="button" onClick={() => setSelected(index())}>
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
              data-testid="box"
              style={{ width: expanded() ? '300px' : '100px' }}
              onClick={() => setExpanded(value => !value)}
            />
          </div>
        </div>
      </Stage>
    </>
  )
}
