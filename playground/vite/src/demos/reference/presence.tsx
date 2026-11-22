import { createSignal, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'presence',
  title: 'AnimatePresence',
  group: 'reference',
  description: 'Show/hide a box; the exit animation plays before the element is removed from the DOM.',
  covers: ['AnimatePresence', 'motion'],
} as const

export default function Demo() {
  const [visible, setVisible] = createSignal(true)

  return (
    <>
      <Controls>
        <Button onClick={() => setVisible(value => !value)}>{visible() ? 'Hide' : 'Show'}</Button>
        <Readout label="mounted (state)" value={String(visible())} />
      </Controls>
      <Stage>
        <AnimatePresence>
          <Show when={visible()}>
            <motion.div
              class="box"
              data-testid="box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            />
          </Show>
        </AnimatePresence>
      </Stage>
    </>
  )
}
