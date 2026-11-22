import { createSignal, For, onSettled } from 'solid-js'
import {
  createMotionValueEvent, createReducedMotionConfig, createScroll, createSpring, createTransform, inView, motion, MotionConfig,
} from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'story-5',
  title: 'Scroll story 5: + section-linked nav and reducedMotion',
  group: 'cumulative',
  description: 'Story 4 reduced to its essentials plus a fixed section nav. Page colour is createTransform over page progress, each nav dot fills from a per-section createScroll target, the active section comes from inView(), and a MotionConfig reducedMotion selector shows how reveals degrade (opacity only, no travel).',
  covers: ['createMotionValueEvent', 'createReducedMotionConfig', 'createScroll', 'createSpring', 'createTransform', 'inView', 'motion', 'MotionConfig'],
  level: 5,
} as const

const names = ['Arrival', 'Context', 'Detail', 'Evidence', 'Departure']
const colours = ['#dbeafe', '#ede9fe', '#fce7f3', '#ffedd5', '#dcfce7']

function Section(props: { index: number; name: string; ref: (el: HTMLElement) => void }) {
  let el!: HTMLElement
  const { scrollYProgress } = createScroll(() => ({ target: () => el, offset: ['start end', 'end start'] }))
  const [p, setP] = createSignal(0)
  createMotionValueEvent(scrollYProgress, 'change', value => setP(value))
  return (
    <section
      ref={[node => { el = node }, props.ref]}
      data-testid="section"
      style={{ height: '90vh', margin: '0 0 12px', display: 'grid', 'place-items': 'center', 'border-radius': '12px', background: 'rgb(255 255 255 / .5)', color: '#111' }}
    >
      <motion.div
        data-testid="reveal"
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        inViewOptions={{ amount: 0.5 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        <h2 style={{ 'font-size': '36px', margin: '0' }}>{props.index + 1}. {props.name}</h2>
        <div>section progress {p().toFixed(2)}</div>
      </motion.div>
    </section>
  )
}

function Inner() {
  const reduced = createReducedMotionConfig()
  const page = createScroll()
  const background = createTransform(page.scrollYProgress, [0, 0.25, 0.5, 0.75, 1], colours)
  const bar = createSpring(page.scrollYProgress, { stiffness: 120, damping: 30 })
  const [active, setActive] = createSignal(0)
  const [progress, setProgress] = createSignal(0)
  createMotionValueEvent(page.scrollYProgress, 'change', value => setProgress(value))
  const els: HTMLElement[] = []

  onSettled(() => {
    const stops = els.map((el, i) => inView(el, () => { setActive(i) }, { amount: 0.5 }))
    return () => stops.forEach(stop => stop())
  })

  return (
    <motion.div data-testid="page" style={{ background, padding: '12px', borderRadius: '14px' }}>
      <motion.div class="progress" style={{ scaleX: bar }} />
      <nav style={{ position: 'fixed', right: '20px', top: '50%', transform: 'translateY(-50%)', display: 'grid', gap: '8px', 'z-index': '6' }}>
        <For each={names}>
          {(name, i) => (
            <button
              type="button"
              data-testid="dot"
              aria-current={active() === i() ? 'true' : undefined}
              title={name}
              onClick={() => els[i()].scrollIntoView({ behavior: 'instant' })}
              style={{ width: '16px', height: '16px', 'border-radius': '99px', border: '2px solid #6d28d9', background: active() === i() ? '#6d28d9' : 'transparent', cursor: 'pointer' }}
            />
          )}
        </For>
      </nav>
      <div style={{ position: 'sticky', top: '6px', 'z-index': '5', 'padding-bottom': '4px' }}>
        <Controls>
          <Readout label="progress" value={progress().toFixed(3)} />
          <Readout label="active section" value={names[active()]} />
          <Readout label="reduced motion" value={reduced() ? 'yes' : 'no'} />
        </Controls>
      </div>
      <For each={names}>{(name, i) => <Section index={i()} name={name} ref={el => { els[names.indexOf(name)] = el }} />}</For>
    </motion.div>
  )
}

export default function Demo() {
  const [mode, setMode] = createSignal<'user' | 'always' | 'never'>('never')
  return (
    <MotionConfig reducedMotion={mode()}>
      <Controls>
        <label>
          reducedMotion{' '}
          <select value={mode()} onChange={e => setMode(e.currentTarget.value as 'user' | 'always' | 'never')}>
            <option value="never">never</option>
            <option value="user">user (OS)</option>
            <option value="always">always</option>
          </select>
        </label>
        <span>Switch to "always", Remount, then scroll: reveals fade without moving.</span>
      </Controls>
      <Inner />
    </MotionConfig>
  )
}
