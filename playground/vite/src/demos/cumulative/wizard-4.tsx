import { createSignal, For, Match, onSettled, Show, Switch } from 'solid-js'
import { AnimatePresence, createAnimate, createAnimationControls, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'wizard-4',
  title: 'Wizard 4: + shake on error, completion sequence, keyboard',
  group: 'cumulative',
  description: 'Wizard 3 plus validation: an invalid Next shakes the fields via createAnimationControls. Finishing plays a createAnimate sequence (ring, title, rows). Enter advances, Escape goes back; Replay re-runs the sequence.',
  covers: ['AnimatePresence', 'createAnimate', 'createAnimationControls', 'motion'],
  level: 4,
} as const

const steps = ['Account', 'Plan', 'Confirm']
const plans = ['Free', 'Pro', 'Team']
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 80 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, when: 'beforeChildren', staggerChildren: 0.08 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80, transition: { duration: 0.2 } }),
}
const fieldVariants = { enter: { opacity: 0, y: 12 }, center: { opacity: 1, y: 0 } }

function Done(props: { name: string; onState: (state: string) => void }) {
  const [scope, animate] = createAnimate<HTMLDivElement>()
  const play = () => {
    props.onState('running')
    const sequence = animate([
      ['[data-k=ring]', { scale: [0.2, 1], opacity: [0, 1] }, { duration: 0.4 }],
      ['[data-k=title]', { opacity: [0, 1], y: [16, 0] }, { duration: 0.3, at: '-0.1' }],
      ['[data-k=row]', { opacity: [0, 1], x: [-20, 0] }, { duration: 0.25, at: '+0.05' }],
    ])
    sequence.then(() => props.onState('finished'))
  }
  onSettled(() => play())
  return (
    <div ref={scope} data-testid="done" style={{ 'text-align': 'center', position: 'absolute', inset: '0' }}>
      <div data-k="ring" style={{ width: '56px', height: '56px', margin: '0 auto 8px', 'border-radius': '99px', background: 'var(--ok)', opacity: '0' }} />
      <h3 data-k="title" style={{ margin: '0 0 8px', opacity: '0' }}>All set, {props.name || 'friend'}!</h3>
      <For each={['Account created', 'Plan applied', 'Welcome email sent']}>
        {row => <div data-k="row" style={{ opacity: '0' }}>{row}</div>}
      </For>
      <Button onClick={play}>Replay</Button>
    </div>
  )
}

export default function Demo() {
  const [step, setStep] = createSignal(0)
  const [direction, setDirection] = createSignal(1)
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [plan, setPlan] = createSignal('Free')
  const [done, setDone] = createSignal(false)
  const [error, setError] = createSignal('')
  const [shakes, setShakes] = createSignal(0)
  const [sequence, setSequence] = createSignal('idle')
  const controls = createAnimationControls()

  const validate = () => {
    if (step() === 0 && !name().trim()) return 'Name is required'
    if (step() === 0 && !/^\S+@\S+\.\S+$/.test(email())) return 'Enter a valid email'
    return ''
  }
  const next = () => {
    if (done()) return
    const problem = validate()
    setError(problem)
    if (problem) {
      setShakes(n => n + 1)
      controls.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.4 } })
      return
    }
    setDirection(1)
    if (step() < steps.length - 1) setStep(s => s + 1)
    else setDone(true)
  }
  const back = () => {
    if (done() || step() === 0) return
    setError('')
    setDirection(-1)
    setStep(s => s - 1)
  }
  const reset = () => { setStep(0); setDirection(-1); setName(''); setEmail(''); setPlan('Free'); setDone(false); setError(''); setSequence('idle') }

  onSettled(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); next() }
      else if (event.key === 'Escape') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const Step = (props: { n: number; children: any }) => (
    <motion.div
      data-testid={`step-${props.n}`}
      custom={direction()}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ display: 'grid', gap: '10px', position: 'absolute', inset: '0 0 auto 0' }}
    >
      {/* The shake targets this inner wrapper so it never fights the slide variants above. */}
      <motion.div animate={controls} data-testid="shake" style={{ display: 'grid', gap: '10px' }}>
        {props.children}
      </motion.div>
    </motion.div>
  )

  return (
    <>
      <Controls>
        <Readout label="step" value={done() ? 'done' : `${step() + 1} / ${steps.length}`} />
        <Readout label="shakes" value={shakes().toString()} />
        <Readout label="sequence" value={sequence()} ok={sequence() === 'finished'} />
        <span>Keys: Enter = next, Esc = back</span>
      </Controls>
      <Stage height="340px">
        <div data-testid="wizard" style={{ width: '100%', 'max-width': '420px' }}>
          <ol style={{ display: 'flex', gap: '8px', padding: '0', margin: '0 0 16px', 'list-style': 'none' }}>
            <For each={steps}>
              {(label, i) => <li style={{ 'font-weight': i() === step() && !done() ? '700' : '400', color: i() <= step() ? 'var(--accent)' : 'var(--muted)' }}>{i() + 1}. {label}</li>}
            </For>
          </ol>
          <div style={{ height: '150px', position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" custom={direction()}>
              <Switch>
                <Match when={done()}><Done name={name()} onState={setSequence} /></Match>
                <Match when={step() === 0}>
                  <Step n={0}>
                    <motion.label variants={fieldVariants}>Name <input data-testid="name" value={name()} onInput={e => setName(e.currentTarget.value)} /></motion.label>
                    <motion.label variants={fieldVariants}>Email <input data-testid="email" value={email()} onInput={e => setEmail(e.currentTarget.value)} /></motion.label>
                  </Step>
                </Match>
                <Match when={step() === 1}>
                  <Step n={1}>
                    <For each={plans}>
                      {p => <motion.label variants={fieldVariants}><input type="radio" name="plan" checked={plan() === p} onChange={() => setPlan(p)} /> {p}</motion.label>}
                    </For>
                  </Step>
                </Match>
                <Match when={step() === 2}>
                  <Step n={2}>
                    <motion.p variants={fieldVariants}>Plan: <b>{plan()}</b></motion.p>
                    <motion.p variants={fieldVariants}>{name()} &lt;{email()}&gt;</motion.p>
                  </Step>
                </Match>
              </Switch>
            </AnimatePresence>
          </div>
          <div data-testid="error" role="alert" style={{ color: 'var(--bad)', 'min-height': '20px' }}>
            <Show when={error()}>{error()}</Show>
          </div>
          <Controls>
            <Button disabled={step() === 0 || done()} onClick={back}>Back</Button>
            <Button disabled={done()} onClick={next}>{step() < steps.length - 1 ? 'Next' : 'Finish'}</Button>
            <Button onClick={reset}>Reset</Button>
          </Controls>
        </div>
      </Stage>
    </>
  )
}
