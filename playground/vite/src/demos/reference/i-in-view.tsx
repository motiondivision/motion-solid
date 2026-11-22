import { createSignal, For } from 'solid-js'
import { createDomRef, motion } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'i-in-view',
  title: 'Interaction: whileInView + viewport callbacks',
  group: 'reference',
  description: 'A scroll container with items using whileInView, onViewportEnter/Leave, inViewOptions (root, amount, margin, once) and the viewport alias.',
  covers: ['createDomRef', 'motion'],
} as const

export default function Demo() {
  const [root, rootRef] = createDomRef<HTMLDivElement>()
  const [enters, setEnters] = createSignal(0)
  const [leaves, setLeaves] = createSignal(0)
  const [once, setOnce] = createSignal(false)
  const [amountAll, setAmountAll] = createSignal(false)

  return (
    <>
      <Controls>
        <Readout label="viewportEnter" value={enters()} />
        <Readout label="viewportLeave" value={leaves()} />
        <Button pressed={once()} onClick={() => setOnce(v => !v)}>once: {String(once())}</Button>
        <Button pressed={amountAll()} onClick={() => setAmountAll(v => !v)}>amount: {amountAll() ? 'all' : '0.5'}</Button>
        <span>Scroll the box below. Item A tracks enter/leave; B uses the `viewport` alias.</span>
      </Controls>
      <div
        ref={rootRef}
        data-testid="scroller"
        style={{ height: '260px', overflow: 'auto', border: '1px dashed var(--border)', 'border-radius': '10px', padding: '12px' }}
      >
        <div style={{ height: '320px' }}>Scroll down</div>
        <motion.div
          class="box"
          data-testid="item-a"
          initial={{ opacity: 0.2, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          inViewOptions={{ root: root(), amount: amountAll() ? 'all' : 0.5, once: once() }}
          onViewportEnter={() => setEnters(n => n + 1)}
          onViewportLeave={() => setLeaves(n => n + 1)}
        />
        <div style={{ height: '320px' }} />
        <motion.div
          class="box"
          data-testid="item-b"
          style={{ background: '#22c55e' }}
          initial={{ x: -80, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ root: root(), margin: '0px 0px -50px 0px' }}
        />
        <div style={{ height: '200px' }}>
          <For each={['end']}>{label => <span>{label}</span>}</For>
        </div>
      </div>
    </>
  )
}
