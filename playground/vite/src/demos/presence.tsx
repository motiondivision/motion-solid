import { createSignal, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'

export function PresenceDemo() {
  const [visible, setVisible] = createSignal(true)

  return (
    <section>
      <h2>AnimatePresence</h2>
      <button class="btn" onClick={() => setVisible(value => !value)}>
        {visible() ? 'Hide' : 'Show'}
      </button>
      <div style={{ 'margin-top': '16px' }}>
        <AnimatePresence>
          <Show when={visible()}>
            <motion.div
              class="box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            />
          </Show>
        </AnimatePresence>
      </div>
    </section>
  )
}
