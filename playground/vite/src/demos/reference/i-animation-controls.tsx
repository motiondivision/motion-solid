import { createSignal, onSettled } from 'solid-js'
import { animationControls, createAnimationControls, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-animation-controls',
  title: 'Imperative: animation controls',
  group: 'reference',
  description: 'createAnimationControls and the owner-free animationControls(): start/stop/set, variants as targets, shared controls driving two elements.',
  covers: ['animationControls', 'createAnimationControls', 'motion'],
} as const

const variants = {
  left: { x: 0, backgroundColor: '#6366f1' },
  right: { x: 220, backgroundColor: '#f59e0b' },
}

// Module-level controls: not tied to an owner, so mount() is called by hand.
const standalone = animationControls()

export default function Demo() {
  const controls = createAnimationControls()
  const [started, setStarted] = createSignal('-')
  const [completed, setCompleted] = createSignal(0)

  onSettled(() => {
    const unmount = standalone.mount()
    return () => unmount()
  })

  return (
    <>
      <Controls>
        <Button onClick={() => { setStarted('right'); controls.start('right').then(() => setCompleted(n => n + 1)) }}>start('right')</Button>
        <Button onClick={() => { setStarted('left'); controls.start('left').then(() => setCompleted(n => n + 1)) }}>start('left')</Button>
        <Button onClick={() => controls.start({ rotate: 180, transition: { duration: 1 } })}>start rotate 180</Button>
        <Button onClick={() => controls.stop()}>stop()</Button>
        <Button onClick={() => controls.set({ x: 110, rotate: 0 })}>set(x:110)</Button>
        <Readout label="last start" value={started()} />
        <Readout label="start() promises resolved" value={completed()} />
      </Controls>
      <Stage height="180px">
        <motion.div class="box" data-testid="ctl-a" variants={variants} initial="left" animate={controls} />
        <motion.div class="box" data-testid="ctl-b" style={{ background: '#14b8a6' }} variants={variants} animate={controls} />
      </Stage>
      <Controls>
        <Button onClick={() => standalone.start({ scale: 1.5, transition: { duration: 0.4 } })}>animationControls(): scale 1.5</Button>
        <Button onClick={() => standalone.start({ scale: 1 })}>scale 1</Button>
      </Controls>
      <Stage height="140px">
        <motion.div class="box" data-testid="standalone" style={{ background: '#ec4899' }} animate={standalone} />
      </Stage>
    </>
  )
}
