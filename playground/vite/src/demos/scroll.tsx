import { createMotionTemplate, createScroll, createSpring, createTransform, motion } from 'motion-solid'

export function ScrollDemo() {
  const { scrollYProgress } = createScroll()
  const scaleX = createSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const hue = createTransform(scrollYProgress, [0, 1], [0, 360])
  const background = createMotionTemplate`hsl(${hue} 80% 55%)`

  return (
    <section>
      <h2>createScroll / createTransform</h2>
      <motion.div class="progress" style={{ scaleX, background }} />
      <p>Scroll the page. The bar is driven by createScroll, smoothed with createSpring, and coloured with createTransform.</p>
      <div class="tall" />
      <div class="tall" />
    </section>
  )
}
