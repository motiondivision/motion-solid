import { createSignal, For } from 'solid-js'
import { createMotionValueEvent, createScroll, motion } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'story-3',
  title: 'Scroll story 3: + whileInView reveals',
  group: 'cumulative',
  description: 'Story 2 plus whileInView reveal cards. The left card of each section reveals once (inViewOptions.once), the right card re-triggers every time it re-enters. Enter/leave callbacks count the events.',
  covers: ['createMotionValueEvent', 'createScroll', 'motion'],
  level: 3,
} as const

const sections = ['Arrival', 'Context', 'Detail', 'Evidence', 'Departure']
const hues = [210, 260, 320, 20, 150]

export default function Demo() {
  const { scrollYProgress } = createScroll()
  const [progress, setProgress] = createSignal(0)
  createMotionValueEvent(scrollYProgress, 'change', value => setProgress(value))
  const [onceEnters, setOnceEnters] = createSignal<number[]>(sections.map(() => 0))
  const [repeatEnters, setRepeatEnters] = createSignal<number[]>(sections.map(() => 0))
  const bump = (setter: (fn: (list: number[]) => number[]) => void, i: number) =>
    setter(list => list.map((n, k) => (k === i ? n + 1 : n)))
  let root!: HTMLDivElement
  const jump = (index: number) => root.querySelectorAll('section')[index]?.scrollIntoView({ behavior: 'instant' })

  const card = (kind: 'once' | 'repeat', i: number) => (
    <motion.div
      data-testid={`${kind}-${i}`}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      inViewOptions={{ once: kind === 'once', amount: 0.6 }}
      transition={{ duration: 0.5 }}
      onViewportEnter={() => bump(kind === 'once' ? setOnceEnters : setRepeatEnters, i)}
      style={{ flex: '1', padding: '16px', borderRadius: '10px', background: 'var(--panel)', border: '1px solid var(--border)' }}
    >
      <b>{kind === 'once' ? 'Reveals once' : 'Reveals every time'}</b>
      <div class="readout-value">enters: {(kind === 'once' ? onceEnters() : repeatEnters())[i]}</div>
    </motion.div>
  )

  return (
    <div ref={root}>
      <motion.div class="progress" style={{ scaleX: scrollYProgress }} />
      <div style={{ position: 'sticky', top: '6px', 'z-index': '5', background: 'var(--bg)', 'padding-bottom': '4px' }}>
        <Controls>
          <Readout label="progress" value={progress().toFixed(3)} />
          <Readout label="max once-enters" value={Math.max(...onceEnters()).toString()} ok={Math.max(...onceEnters()) <= 1} />
          <Readout label="max repeat-enters" value={Math.max(...repeatEnters()).toString()} />
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
              background: `hsl(${hues[i()]} 60% 60% / .35)`, display: 'flex', 'flex-direction': 'column', 'justify-content': 'center', gap: '16px',
            }}
          >
            <h2 style={{ margin: '0', 'font-size': '36px' }}>{i() + 1}. {name}</h2>
            <div style={{ display: 'flex', gap: '16px' }}>
              {card('once', i())}
              {card('repeat', i())}
            </div>
          </section>
        )}
      </For>
    </div>
  )
}
