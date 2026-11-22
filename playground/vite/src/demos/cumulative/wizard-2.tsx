import { createSignal, For, Match, Switch } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'wizard-2',
  title: 'Wizard 2: + AnimatePresence wait slides',
  group: 'cumulative',
  description: 'Wizard 1 with each step wrapped in AnimatePresence mode="wait": the old step slides out fully before the next slides in. Readouts count steps in the DOM so overlap would show up as 2.',
  covers: ['AnimatePresence', 'motion'],
  level: 2,
} as const

const steps = ['Account', 'Plan', 'Confirm']
const plans = ['Free', 'Pro', 'Team']
const slide = { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -50 }, transition: { duration: 0.25 } }

export default function Demo() {
  const [step, setStep] = createSignal(0)
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [plan, setPlan] = createSignal('Free')
  const [mounted, setMounted] = createSignal(0)
  const [exits, setExits] = createSignal(0)
  let host!: HTMLDivElement
  const count = () => setMounted(host.querySelectorAll('[data-step]').length)

  const go = (delta: number) => {
    setStep(s => s + delta)
    // Sample after the next frames so the readout shows the DOM mid-transition and settled.
    for (const ms of [50, 150, 600]) setTimeout(count, ms)
  }

  return (
    <>
      <Controls>
        <Readout label="step" value={`${step() + 1} / ${steps.length}`} />
        <Readout label="steps in DOM (sampled)" value={mounted().toString()} ok={mounted() <= 1} />
        <Readout label="exits completed" value={exits().toString()} />
      </Controls>
      <Stage height="320px">
        <div data-testid="wizard" style={{ width: '100%', 'max-width': '420px' }}>
          <ol style={{ display: 'flex', gap: '8px', padding: '0', margin: '0 0 16px', 'list-style': 'none' }}>
            <For each={steps}>
              {(label, i) => <li style={{ 'font-weight': i() === step() ? '700' : '400', color: i() <= step() ? 'var(--accent)' : 'var(--muted)' }}>{i() + 1}. {label}</li>}
            </For>
          </ol>
          <div ref={host} style={{ 'min-height': '150px', position: 'relative' }}>
            <AnimatePresence mode="wait" onExitComplete={() => setExits(n => n + 1)}>
              <Switch>
                <Match when={step() === 0}>
                  <motion.div data-step="0" data-testid="step-0" {...slide} style={{ display: 'grid', gap: '10px' }}>
                    <label>Name <input value={name()} onInput={e => setName(e.currentTarget.value)} /></label>
                    <label>Email <input value={email()} onInput={e => setEmail(e.currentTarget.value)} /></label>
                  </motion.div>
                </Match>
                <Match when={step() === 1}>
                  <motion.div data-step="1" data-testid="step-1" {...slide} style={{ display: 'grid', gap: '8px' }}>
                    <For each={plans}>
                      {p => <label><input type="radio" name="plan" checked={plan() === p} onChange={() => setPlan(p)} /> {p}</label>}
                    </For>
                  </motion.div>
                </Match>
                <Match when={step() === 2}>
                  <motion.p data-step="2" data-testid="step-2" {...slide}>Create <b>{plan()}</b> account for {name() || '(no name)'} &lt;{email() || 'no email'}&gt;?</motion.p>
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
