import { createSignal, For } from 'solid-js'
import { createMotionValueEvent, createScroll, motion } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'story-2',
  title: 'Scroll story 2: + progress bar',
  group: 'cumulative',
  description: 'Story 1 plus createScroll: a fixed bar scaleX is bound straight to scrollYProgress. The HUD cross-checks it against scrollY / maxScroll.',
  covers: ['createMotionValueEvent', 'createScroll', 'motion'],
  level: 2,
} as const

const sections = ['Arrival', 'Context', 'Detail', 'Evidence', 'Departure']
const hues = [210, 260, 320, 20, 150]

export default function Demo() {
  const { scrollY, scrollYProgress } = createScroll()
  const [progress, setProgress] = createSignal(0)
  const [expected, setExpected] = createSignal(0)
  const [y, setY] = createSignal(0)
  createMotionValueEvent(scrollYProgress, 'change', value => {
    setProgress(value)
    setY(scrollY.get())
    setExpected(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
  })
  let root!: HTMLDivElement
  const jump = (index: number) => root.querySelectorAll('section')[index]?.scrollIntoView({ behavior: 'instant' })

  return (
    <div ref={root}>
      <motion.div class="progress" data-testid="bar" style={{ scaleX: scrollYProgress }} />
      <div style={{ position: 'sticky', top: '6px', 'z-index': '5', background: 'var(--bg)', 'padding-bottom': '4px' }}>
        <Controls>
          <Readout label="scrollY (mv)" value={Math.round(y()).toString()} />
          <Readout label="scrollYProgress" value={progress().toFixed(3)} />
          <Readout label="expected" value={expected().toFixed(3)} ok={Math.abs(progress() - expected()) < 0.02} />
          <For each={sections}>{(name, i) => <Button onClick={() => jump(i())}>{name}</Button>}</For>
          <Button onClick={() => window.scrollTo(0, 0)}>Top</Button>
        </Controls>
      </div>
      <For each={sections}>
        {(name, i) => (
          <section
            data-testid="section"
            style={{
              height: '80vh', margin: '0 0 12px', padding: '24px', 'border-radius': '12px',
              background: `hsl(${hues[i()]} 60% 60% / .35)`, display: 'flex', 'flex-direction': 'column', 'justify-content': 'center',
            }}
          >
            <h2 style={{ margin: '0 0 8px', 'font-size': '36px' }}>{i() + 1}. {name}</h2>
            <p style={{ margin: '0', color: 'var(--muted)', 'max-width': '48ch' }}>The top bar is scaleX = scrollYProgress.</p>
          </section>
        )}
      </For>
    </div>
  )
}
