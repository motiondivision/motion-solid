import { createSignal, For } from 'solid-js'
import { motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-variants',
  title: 'Variants: inheritance, custom, orchestration',
  group: 'reference',
  description: 'Parent variant labels flow to children; dynamic variants read custom; staggerChildren, delayChildren and when; inherit={false} cuts the tree.',
  covers: ['motion'],
} as const

type When = 'beforeChildren' | 'afterChildren' | false

export default function Demo() {
  const [open, setOpen] = createSignal(false)
  const [when, setWhen] = createSignal<When>('beforeChildren')
  const [stagger, setStagger] = createSignal(0.12)
  const [offsets, setOffsets] = createSignal<number[]>([])
  const [parentStart, setParentStart] = createSignal<number | undefined>()
  let t0 = 0
  const mark = () => { t0 = performance.now(); setOffsets([]); setParentStart(undefined) }

  const list = () => ({
    closed: { backgroundColor: '#334155' },
    open: {
      backgroundColor: '#1e40af',
      transition: { when: when(), staggerChildren: stagger(), delayChildren: 0.1, duration: 0.3 },
    },
  })
  // Dynamic variant: a function of `custom`.
  const item = {
    closed: { opacity: 0, x: -40 },
    open: (index: number) => ({ opacity: 1, x: 0, transition: { duration: 0.3 + index * 0.05 } }),
  }

  return (
    <>
      <Controls>
        <Button onClick={() => { mark(); setOpen(v => !v) }}>{open() ? 'Close' : 'Open'}</Button>
        <Button onClick={() => setWhen(w => (w === 'beforeChildren' ? 'afterChildren' : w === 'afterChildren' ? false : 'beforeChildren'))}>when: {String(when())}</Button>
        <label>
          staggerChildren {stagger().toFixed(2)}s
          <input type="range" min="0" max="0.4" step="0.02" value={stagger()} onInput={e => setStagger(Number(e.currentTarget.value))} />
        </label>
        <Readout label="parent start (ms)" value={parentStart() === undefined ? '-' : parentStart()!.toFixed(0)} />
        <Readout label="child start offsets (ms)" value={offsets().map(o => o.toFixed(0)).join(' ') || '-'} />
      </Controls>
      <Stage height="300px">
        <motion.ul
          class="reorder"
          data-testid="list"
          variants={list()}
          initial="closed"
          animate={open() ? 'open' : 'closed'}
          style={{ padding: '10px', borderRadius: '10px' }}
          onAnimationStart={() => setParentStart(performance.now() - t0)}
        >
          <For each={[0, 1, 2, 3]}>
            {i => (
              <motion.li
                variants={item}
                custom={i}
                data-testid={'item-' + i}
                onAnimationStart={() => setOffsets(list => [...list, performance.now() - t0])}
              >
                Item {i}
              </motion.li>
            )}
          </For>
          <motion.li
            inherit={false}
            data-testid="item-detached"
            variants={item}
            animate="open"
            custom={0}
            initial="closed"
          >
            inherit=false (always open)
          </motion.li>
        </motion.ul>
      </Stage>
    </>
  )
}
