import { createCycle, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-cycle',
  title: 'createCycle',
  group: 'reference',
  description: 'createCycle steps through values (wrapping) or jumps to an index; here x positions and colours.',
  covers: ['createCycle', 'motion'],
} as const

export default function Demo() {
  const [x, cycleX] = createCycle(0, 120, 240, 360)
  const [colour, cycleColour] = createCycle('#6366f1', '#22c55e', '#f59e0b')
  return (
    <>
      <Controls>
        <Button onClick={() => cycleX()}>next x</Button>
        <Button onClick={() => cycleX(0)}>x to index 0</Button>
        <Button onClick={() => cycleX(3)}>x to index 3</Button>
        <Button onClick={() => cycleColour()}>next colour</Button>
        <Readout label="x" value={x()} />
        <Readout label="colour" value={colour()} />
      </Controls>
      <Stage height="140px">
        <motion.div class="box" data-testid="cycle-box" animate={{ x: x(), backgroundColor: colour() }} onTap={() => cycleX()} />
      </Stage>
      <p>Tapping the box also cycles x.</p>
    </>
  )
}
