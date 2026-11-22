import { createSignal, For } from 'solid-js'
import { createMotionValueEvent, createScroll, createSpring, createTransform, createVelocity, motion } from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'story-4',
  title: 'Scroll story 4: + parallax, sticky, velocity skew',
  group: 'cumulative',
  description: 'Story 3 plus a 250vh hero holding a sticky stage. Three layers move at different rates (createTransform of target-relative progress, smoothed by createSpring with a stiffness slider), and the headline skews with scroll velocity (createVelocity).',
  covers: ['createMotionValueEvent', 'createScroll', 'createSpring', 'createTransform', 'createVelocity', 'motion'],
  level: 4,
} as const

const sections = ['Context', 'Detail', 'Evidence']

export default function Demo() {
  let hero!: HTMLDivElement
  const page = createScroll()
  const heroScroll = createScroll(() => ({ target: () => hero, offset: ['start start', 'end end'] }))
  const [stiffness, setStiffness] = createSignal(120)
  const smooth = createSpring(heroScroll.scrollYProgress, () => ({ stiffness: stiffness(), damping: 25, mass: 0.5 }))

  const back = createTransform(smooth, [0, 1], ['0px', '-60px'])
  const mid = createTransform(smooth, [0, 1], ['0px', '-240px'])
  const front = createTransform(smooth, [0, 1], ['0px', '-520px'])
  const velocity = createVelocity(page.scrollY)
  const skewTarget = createTransform(velocity, [-2500, 0, 2500], [-14, 0, 14], { clamp: true })
  const skewY = createSpring(skewTarget, { stiffness: 200, damping: 20 })

  const [progress, setProgress] = createSignal(0)
  const [vel, setVel] = createSignal(0)
  const [skew, setSkew] = createSignal(0)
  const [peakSkew, setPeakSkew] = createSignal(0)
  createMotionValueEvent(heroScroll.scrollYProgress, 'change', value => setProgress(value))
  createMotionValueEvent(velocity, 'change', value => setVel(value))
  createMotionValueEvent(skewY, 'change', value => {
    setSkew(value)
    setPeakSkew(peak => (Math.abs(value) > Math.abs(peak) ? value : peak))
  })

  const layer = (name: string, y: typeof back, color: string, top: string, size: string) => (
    <motion.div
      data-testid={name}
      style={{
        y, position: 'absolute', left: '10%', top, width: size, height: size, background: color, borderRadius: '24px',
        display: 'grid', placeItems: 'center', color: '#fff', fontWeight: '700',
      }}
    >
      {name}
    </motion.div>
  )

  return (
    <div>
      <motion.div class="progress" style={{ scaleX: createSpring(page.scrollYProgress, { stiffness: 100, damping: 30 }) }} />
      <div style={{ position: 'sticky', top: '6px', 'z-index': '5', background: 'var(--bg)', 'padding-bottom': '4px' }}>
        <Controls>
          <Readout label="hero progress" value={progress().toFixed(3)} />
          <Readout label="velocity px/s" value={Math.round(vel()).toString()} />
          <Readout label="skewY deg" value={skew().toFixed(1)} />
          <Readout label="peak skew" value={peakSkew().toFixed(1)} ok={Math.abs(peakSkew()) > 1} />
          <label>spring stiffness <input type="range" min="20" max="600" value={stiffness()} onInput={e => setStiffness(Number(e.currentTarget.value))} /> {stiffness()}</label>
        </Controls>
      </div>
      <div ref={hero} data-testid="hero" style={{ height: '250vh', position: 'relative' }}>
        <div
          data-testid="sticky"
          style={{ position: 'sticky', top: '56px', height: '70vh', overflow: 'hidden', 'border-radius': '14px', background: 'linear-gradient(#1e1b4b, #7c3aed)' }}
        >
          {layer('back', back, '#4c1d95', '10%', '40%')}
          {layer('mid', mid, '#c026d3', '40%', '30%')}
          {layer('front', front, '#f43f5e', '110%', '35%')}
          <motion.h2
            data-testid="headline"
            style={{ skewY, position: 'absolute', right: '8%', top: '30%', margin: '0', color: '#fff', fontSize: '48px' }}
          >
            Scroll fast
          </motion.h2>
        </div>
      </div>
      <For each={sections}>
        {(name, i) => (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            inViewOptions={{ once: true, amount: 0.5 }}
            style={{ height: '60vh', margin: '12px 0', padding: '24px', borderRadius: '12px', background: `hsl(${i() * 90 + 200} 60% 60% / .35)`, display: 'grid', placeItems: 'center' }}
          >
            <h2>{name}: revealed once</h2>
          </motion.section>
        )}
      </For>
    </div>
  )
}
