import { createSignal, For, Match, Switch } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'wizard-3',
  title: 'Wizard 3: + direction-aware variants, staggered fields',
  group: 'cumulative',
  description: 'Wizard 2 with custom variants: Next slides left-to-right, Back reverses, and the direction reaches the exiting step through AnimatePresence custom. Fields inside each step stagger in via staggerChildren.',
  covers: ['AnimatePresence', 'motion'],
  level: 3,
} as const

const steps = ['Account', 'Plan', 'Confirm']
const plans = ['Free', 'Pro', 'Team']

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 80 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, when: 'beforeChildren', staggerChildren: 0.08 } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -80, transition: { duration: 0.2 } }),
}
const fieldVariants = { enter: { opacity: 0, y: 12 }, center: { opacity: 1, y: 0 } }

export default function Demo() {
  const [step, setStep] = createSignal(0)
  const [direction, setDirection] = createSignal(1)
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [plan, setPlan] = createSignal('Free')

  const go = (delta: 1 | -1) => {
    setDirection(delta)
    setStep(s => s + delta)
  }

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
      {props.children}
    </motion.div>
  )

  return (
    <>
      <Controls>
        <Readout label="step" value={`${step() + 1} / ${steps.length}`} />
        <Readout label="direction" value={direction() > 0 ? 'forward (+1)' : 'back (-1)'} />
      </Controls>
      <Stage height="320px">
        <div data-testid="wizard" style={{ width: '100%', 'max-width': '420px' }}>
          <ol style={{ display: 'flex', gap: '8px', padding: '0', margin: '0 0 16px', 'list-style': 'none' }}>
            <For each={steps}>
              {(label, i) => <li style={{ 'font-weight': i() === step() ? '700' : '400', color: i() <= step() ? 'var(--accent)' : 'var(--muted)' }}>{i() + 1}. {label}</li>}
            </For>
          </ol>
          <div style={{ height: '150px', position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" custom={direction()}>
              <Switch>
                <Match when={step() === 0}>
                  <Step n={0}>
                    <motion.label variants={fieldVariants}>Name <input value={name()} onInput={e => setName(e.currentTarget.value)} /></motion.label>
                    <motion.label variants={fieldVariants}>Email <input value={email()} onInput={e => setEmail(e.currentTarget.value)} /></motion.label>
                  </Step>
                </Match>
                <Match when={step() === 1}>
                  <Step n={1}>
                    <For each={plans}>
                      {p => (
                        <motion.label variants={fieldVariants}>
                          <input type="radio" name="plan" checked={plan() === p} onChange={() => setPlan(p)} /> {p}
                        </motion.label>
                      )}
                    </For>
                  </Step>
                </Match>
                <Match when={step() === 2}>
                  <Step n={2}>
                    <motion.p variants={fieldVariants}>Plan: <b>{plan()}</b></motion.p>
                    <motion.p variants={fieldVariants}>Name: {name() || '(none)'}</motion.p>
                    <motion.p variants={fieldVariants}>Email: {email() || '(none)'}</motion.p>
                  </Step>
                </Match>
              </Switch>
            </AnimatePresence>
          </div>
          <Controls>
            <Button disabled={step() === 0} onClick={() => go(-1)}>Back</Button>
            <Button disabled={step() === steps.length - 1} onClick={() => go(1)}>Next</Button>
          </Controls>
        </div>
      </Stage>
    </>
  )
}
