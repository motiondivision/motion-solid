import { createSignal } from 'solid-js'
import { createDomRef, createInView, motion } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'i-create-in-view',
  title: 'Interaction: createInView',
  group: 'reference',
  description: 'createInView with reactive options: root, margin, amount, once and initial.',
  covers: ['createDomRef', 'createInView', 'motion'],
} as const

export default function Demo() {
  const [root, rootRef] = createDomRef<HTMLDivElement>()
  const [target, targetRef] = createDomRef<HTMLDivElement>()
  const [once, setOnce] = createSignal(false)
  const [amount, setAmount] = createSignal<'some' | 'all' | number>('some')
  const [margin, setMargin] = createSignal<'0px' | '-60px'>('0px')

  const visible = createInView(target, () => ({
    root: root(),
    once: once(),
    amount: amount(),
    margin: margin(),
    initial: false,
  }))

  return (
    <>
      <Controls>
        <Readout label="inView" value={String(visible())} ok={visible()} />
        <Button pressed={once()} onClick={() => setOnce(v => !v)}>once</Button>
        <Button onClick={() => setAmount(a => (a === 'some' ? 'all' : a === 'all' ? 0.5 : 'some'))}>amount: {String(amount())}</Button>
        <Button onClick={() => setMargin(m => (m === '0px' ? '-60px' : '0px'))}>margin: {margin()}</Button>
      </Controls>
      <div
        ref={rootRef}
        data-testid="scroller"
        style={{ height: '240px', overflow: 'auto', border: '1px dashed var(--border)', 'border-radius': '10px', padding: '12px' }}
      >
        <div style={{ height: '300px' }}>Scroll down</div>
        <motion.div
          ref={targetRef}
          class="box"
          data-testid="target"
          animate={{ scale: visible() ? 1.2 : 0.8, backgroundColor: visible() ? '#22c55e' : '#ef4444' }}
        />
        <div style={{ height: '300px' }} />
      </div>
    </>
  )
}
