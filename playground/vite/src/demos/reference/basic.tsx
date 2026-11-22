import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'basic',
  title: 'Basic animate',
  group: 'reference',
  description: 'initial/animate with a spring transition. Toggle moves the box 200px and rotates it 90deg.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [moved, setMoved] = createSignal(false)

  return (
    <>
      <Controls>
        <Button onClick={() => setMoved(value => !value)} pressed={moved()}>Toggle</Button>
        <Readout label="target x" value={moved() ? 200 : 0} />
        <Readout label="target rotate" value={moved() ? 90 : 0} />
      </Controls>
      <Stage>
        <motion.div
          class="box"
          data-testid="box"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1, x: moved() ? 200 : 0, rotate: moved() ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />
      </Stage>
    </>
  )
}
