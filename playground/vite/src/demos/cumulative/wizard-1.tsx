import { createSignal, For, Match, Switch } from 'solid-js'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'wizard-1',
  title: 'Wizard 1: plain steps',
  group: 'cumulative',
  description: 'Three-step onboarding wizard with plain conditional rendering (Switch/Match) and no motion at all. The baseline the next stages add transitions to.',
  covers: [],
  level: 1,
} as const

const steps = ['Account', 'Plan', 'Confirm']
const plans = ['Free', 'Pro', 'Team']

export default function Demo() {
  const [step, setStep] = createSignal(0)
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [plan, setPlan] = createSignal('Free')
  const [done, setDone] = createSignal(false)

  const reset = () => { setStep(0); setName(''); setEmail(''); setPlan('Free'); setDone(false) }

  return (
    <>
      <Controls>
        <Readout label="step" value={`${step() + 1} / ${steps.length}`} />
        <Readout label="name" value={name() || '-'} />
        <Readout label="email" value={email() || '-'} />
        <Readout label="plan" value={plan()} />
        <Readout label="done" value={String(done())} ok={done()} />
      </Controls>
      <Stage height="320px">
        <div data-testid="wizard" style={{ width: '100%', 'max-width': '420px' }}>
          <ol style={{ display: 'flex', gap: '8px', padding: '0', margin: '0 0 16px', 'list-style': 'none' }}>
            <For each={steps}>
              {(label, i) => <li style={{ 'font-weight': i() === step() ? '700' : '400', color: i() <= step() ? 'var(--accent)' : 'var(--muted)' }}>{i() + 1}. {label}</li>}
            </For>
          </ol>
          <div style={{ 'min-height': '150px' }}>
            <Switch>
              <Match when={done()}><h3 data-testid="done">All set, {name() || 'friend'}!</h3></Match>
              <Match when={step() === 0}>
                <div data-testid="step-0" style={{ display: 'grid', gap: '10px' }}>
                  <label>Name <input value={name()} onInput={e => setName(e.currentTarget.value)} /></label>
                  <label>Email <input value={email()} onInput={e => setEmail(e.currentTarget.value)} /></label>
                </div>
              </Match>
              <Match when={step() === 1}>
                <div data-testid="step-1" style={{ display: 'grid', gap: '8px' }}>
                  <For each={plans}>
                    {p => <label><input type="radio" name="plan" checked={plan() === p} onChange={() => setPlan(p)} /> {p}</label>}
                  </For>
                </div>
              </Match>
              <Match when={step() === 2}>
                <p data-testid="step-2">Create <b>{plan()}</b> account for {name() || '(no name)'} &lt;{email() || 'no email'}&gt;?</p>
              </Match>
            </Switch>
          </div>
          <Controls>
            <Button disabled={step() === 0 || done()} onClick={() => setStep(s => s - 1)}>Back</Button>
            <Button disabled={done()} onClick={() => (step() < steps.length - 1 ? setStep(s => s + 1) : setDone(true))}>
              {step() < steps.length - 1 ? 'Next' : 'Finish'}
            </Button>
            <Button onClick={reset}>Reset</Button>
          </Controls>
        </div>
      </Stage>
    </>
  )
}
