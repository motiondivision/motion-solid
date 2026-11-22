import { createSignal } from 'solid-js'
import { createMotionTemplate, createMotionValueEvent, createScroll, createSpring, createTransform, motion } from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'scroll',
  title: 'createScroll / createTransform',
  group: 'reference',
  description: 'A fixed top bar driven by page scroll progress, smoothed by createSpring and coloured via createTransform.',
  covers: ['createMotionTemplate', 'createMotionValueEvent', 'createScroll', 'createSpring', 'createTransform', 'motion'],
} as const

export default function Demo() {
  const { scrollYProgress } = createScroll()
  const scaleX = createSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const hue = createTransform(scrollYProgress, [0, 1], [0, 360])
  const background = createMotionTemplate`hsl(${hue} 80% 55%)`
  const [progress, setProgress] = createSignal(0)
  createMotionValueEvent(scrollYProgress, 'change', value => setProgress(value))

  return (
    <>
      <motion.div class="progress" data-testid="bar" style={{ scaleX, background }} />
      <Controls>
        <Readout label="scrollYProgress" value={progress().toFixed(2)} />
        <span>Scroll the page. The bar at the top of the viewport follows.</span>
      </Controls>
      <div class="tall" />
      <div class="tall" />
    </>
  )
}
