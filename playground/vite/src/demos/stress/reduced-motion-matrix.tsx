import { createSignal, For, onSettled } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { MotionConfig, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'reduced-motion-matrix',
  title: 'Reduced-motion / skipAnimations matrix',
  group: 'stress',
  description:
    'The same animation (x transform, opacity, background colour) under MotionConfig reducedMotion always / never / user, skipAnimations, and a nested override. Sampled every frame: transforms must be instant when reduced, opacity and colour keep animating, skip makes everything instant.',
  covers: ['MotionConfig', 'motion'],
  expects: ['Reduced Motion enabled'],
} as const

type Outcome = 'animated' | 'instant'
type Result = { x: Outcome; opacity: Outcome; color: Outcome }
const prefersReduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Spec {
  id: string
  title: string
  note: string
  wrap: (child: () => JSX.Element) => JSX.Element
  expect: () => Result
}

const ALL_ANIMATED: Result = { x: 'animated', opacity: 'animated', color: 'animated' }
const REDUCED: Result = { x: 'instant', opacity: 'animated', color: 'animated' }
const INSTANT: Result = { x: 'instant', opacity: 'instant', color: 'instant' }

const SPECS: Spec[] = [
  { id: 'always', title: 'reducedMotion="always"', note: 'transforms skipped', wrap: c => <MotionConfig reducedMotion="always" skipAnimations={false}>{c()}</MotionConfig>, expect: () => REDUCED },
  { id: 'never', title: 'reducedMotion="never"', note: 'everything animates', wrap: c => <MotionConfig reducedMotion="never" skipAnimations={false}>{c()}</MotionConfig>, expect: () => ALL_ANIMATED },
  { id: 'user', title: 'reducedMotion="user"', note: 'follows the OS setting', wrap: c => <MotionConfig reducedMotion="user" skipAnimations={false}>{c()}</MotionConfig>, expect: () => (prefersReduce() ? REDUCED : ALL_ANIMATED) },
  { id: 'skip', title: 'skipAnimations (never reduced)', note: 'final values applied at once', wrap: c => <MotionConfig reducedMotion="never" skipAnimations>{c()}</MotionConfig>, expect: () => INSTANT },
  {
    id: 'nested',
    title: 'always, then inner never',
    note: 'inner config overrides the outer',
    wrap: c => (
      <MotionConfig reducedMotion="always" skipAnimations={false}>
        <MotionConfig reducedMotion="never">{c()}</MotionConfig>
      </MotionConfig>
    ),
    expect: () => ALL_ANIMATED,
  },
]

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function classify(samples: number[]): Outcome {
  const start = samples[0]
  const end = samples[samples.length - 1]
  const range = Math.abs(end - start)
  if (range < 1e-6) return 'instant'
  const lo = Math.min(start, end) + range * 0.08
  const hi = Math.max(start, end) - range * 0.08
  return samples.some(v => v > lo && v < hi) ? 'animated' : 'instant'
}

function Cell(props: { spec: Spec; token: number }) {
  const [on, setOn] = createSignal(false)
  const [result, setResult] = createSignal<Result | undefined>()
  let box: HTMLDivElement | undefined
  let busy = false

  const replay = async () => {
    if (busy || !box) return
    busy = true
    const xs: number[] = []
    const opacities: number[] = []
    const reds: number[] = []
    const sample = () => {
      const style = getComputedStyle(box!)
      xs.push(new DOMMatrix(style.transform).m41)
      opacities.push(Number(style.opacity))
      reds.push(Number(/rgba?\((\d+)/.exec(style.backgroundColor)?.[1] ?? 0))
    }
    sample()
    setOn(value => !value)
    const t0 = performance.now()
    await new Promise<void>(resolve => {
      const tick = () => {
        sample()
        if (performance.now() - t0 < 1000) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    setResult({ x: classify(xs), opacity: classify(opacities), color: classify(reds) })
    busy = false
  }

  let lastToken = 0
  onSettled(() => {
    const id = setInterval(() => {
      if (props.token !== lastToken) {
        lastToken = props.token
        void replay()
      }
    }, 100)
    return () => clearInterval(id)
  })

  const row = (key: keyof Result, label: string) => {
    const expected = () => props.spec.expect()[key]
    const got = () => result()?.[key]
    return (
      <tr>
        <th scope="row">{label}</th>
        <td>{expected()}</td>
        <td>{got() ?? '-'}</td>
        <td class="rm-v" data-ok={got() === undefined ? undefined : got() === expected() ? 'true' : 'false'}>
          {got() === undefined ? '' : got() === expected() ? 'PASS' : 'FAIL'}
        </td>
      </tr>
    )
  }

  return (
    <section class="rm-cell" data-cell={props.spec.id}>
      <h3>{props.spec.title}</h3>
      <p>{props.spec.note}</p>
      {props.spec.wrap(() => (
        <div class="rm-track">
          <motion.div
            ref={box}
            class="rm-box"
            initial={false}
            animate={{ x: on() ? 160 : 0, opacity: on() ? 1 : 0.3, backgroundColor: on() ? '#22c55e' : '#f43f5e' }}
            transition={{ duration: 0.6, ease: 'linear' }}
          />
        </div>
      ))}
      <Button onClick={replay}>Replay</Button>
      <table class="rm-table">
        <thead>
          <tr><th>channel</th><th>expected</th><th>observed</th><th></th></tr>
        </thead>
        <tbody>
          {row('x', 'x (transform)')}
          {row('opacity', 'opacity')}
          {row('color', 'background')}
        </tbody>
      </table>
    </section>
  )
}

export default function Demo() {
  const [token, setToken] = createSignal(0)
  const [media, setMedia] = createSignal(prefersReduce())
  onSettled(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setMedia(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  })
  return (
    <>
      <Controls>
        <Button onClick={() => setToken(value => value + 1)}>Replay all</Button>
        <Readout label="OS prefers-reduced-motion" value={media() ? 'reduce' : 'no-preference'} />
        <span>Every cell sets its own reducedMotion and skipAnimations, so the toolbar's global switches do not apply inside the cells.</span>
      </Controls>
      <Stage height="260px" class="rm-stage">
        <For each={SPECS}>{spec => <Cell spec={spec} token={token()} />}</For>
        <style>{`
          .rm-stage{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
          .rm-cell h3{margin:0;font-size:13px}.rm-cell p{margin:2px 0 8px;font-size:12px;color:var(--muted)}
          .rm-track{width:230px;height:46px;position:relative;margin-bottom:8px}
          .rm-box{width:44px;height:44px;border-radius:8px}
          .rm-table{font-size:12px;border-collapse:collapse;margin-top:8px;width:100%}
          .rm-table th,.rm-table td{border-bottom:1px solid var(--border);padding:2px 4px;text-align:left}
          .rm-v{font-weight:600}.rm-v[data-ok=true]{color:var(--ok)}.rm-v[data-ok=false]{color:var(--bad)}
        `}</style>
      </Stage>
    </>
  )
}
