import { createEffect, createSignal, For, onSettled, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import { AnimatePresence, domAnimation, domMax, domMin, LazyMotion, m } from 'motion-solid'
import type { FeatureBundle } from 'motion-solid'
import { Button, Controls, Stage } from '../../ui'

export const meta = {
  id: 'lazy-motion-gating',
  title: 'LazyMotion feature gating',
  group: 'stress',
  description:
    'The same m components under domMin, domAnimation and domMax. Each probe shows whether its feature fired and whether that matches the bundle: gestures are inert under domMin, drag and layout are inert below domMax.',
  covers: ['AnimatePresence', 'domAnimation', 'domMax', 'domMin', 'LazyMotion', 'm'],
} as const

interface Expect { animate: boolean; exit: boolean; hover: boolean; tap: boolean; inview: boolean; layout: boolean; drag: boolean }
type Key = keyof Expect

const COLUMNS: { name: string; bundle: FeatureBundle; expect: Expect }[] = [
  { name: 'domMin', bundle: domMin, expect: { animate: true, exit: true, hover: false, tap: false, inview: false, layout: false, drag: false } },
  { name: 'domAnimation', bundle: domAnimation, expect: { animate: true, exit: true, hover: true, tap: true, inview: true, layout: false, drag: false } },
  { name: 'domMax', bundle: domMax, expect: { animate: true, exit: true, hover: true, tap: true, inview: true, layout: true, drag: true } },
]

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const pointer = (type: string, init: PointerEventInit = {}) =>
  new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, ...init })

type Status = 'PASS' | 'FAIL' | 'todo'

function Row(props: { label: string; expected: boolean; observed: string; status: Status; hint?: string }) {
  return (
    <tr data-status={props.status} data-row={props.label}>
      <th scope="row">{props.label}</th>
      <td>{props.expected ? 'active' : 'inert'}</td>
      <td>{props.observed}</td>
      <td class="lg-status" data-ok={props.status === 'PASS' ? 'true' : props.status === 'FAIL' ? 'false' : undefined} title={props.hint}>
        {props.status === 'todo' ? props.hint ?? 'todo' : props.status}
      </td>
    </tr>
  )
}

function Column(props: { name: string; bundle: FeatureBundle; expect: Expect; runToken: number }) {
  const [animateOpacity, setAnimateOpacity] = createSignal<number | undefined>()
  const [inView, setInView] = createSignal(0)
  const [hover, setHover] = createSignal({ fired: 0, raw: 0 })
  const [tap, setTap] = createSignal({ fired: 0, raw: 0 })
  const [drag, setDrag] = createSignal({ fired: 0, raw: 0 })
  const [layoutProbe, setLayoutProbe] = createSignal<string | undefined>()
  const [exitProbe, setExitProbe] = createSignal<string | undefined>()
  const [wide, setWide] = createSignal(false)
  const [present, setPresent] = createSignal(true)
  let animBox: HTMLDivElement | undefined
  let hoverBox: HTMLDivElement | undefined
  let tapBox: HTMLDivElement | undefined
  let dragBox: HTMLDivElement | undefined
  let layoutBox: HTMLDivElement | undefined
  let exitHost: HTMLDivElement | undefined

  onSettled(() => {
    const id = setTimeout(() => setAnimateOpacity(Number(getComputedStyle(animBox!).opacity)), 900)
    return () => clearTimeout(id)
  })

  const runLayout = async () => {
    const before = layoutBox!.getBoundingClientRect().width
    setWide(value => !value)
    const seen: number[] = []
    const t0 = performance.now()
    while (performance.now() - t0 < 120) {
      await sleep(20)
      seen.push(layoutBox!.getBoundingClientRect().width)
    }
    await sleep(700)
    const after = layoutBox!.getBoundingClientRect().width
    const lo = Math.min(before, after)
    const hi = Math.max(before, after)
    const animated = seen.some(w => w > lo + 3 && w < hi - 3)
    setLayoutProbe(animated ? `animated (${before}px to ${after}px)` : `instant (${before}px to ${after}px)`)
  }
  const runExit = async () => {
    setPresent(false)
    await sleep(80)
    const lingering = exitHost!.querySelector('[data-exit-box]') !== null
    await sleep(900)
    const gone = exitHost!.querySelector('[data-exit-box]') === null
    setExitProbe(`${lingering ? 'lingered during exit' : 'removed at once'}, ${gone ? 'gone after' : 'STILL IN DOM'}`)
    setPresent(true)
  }
  const simulate = async () => {
    hoverBox!.dispatchEvent(pointer('pointerenter', { bubbles: false, buttons: 0 }))
    hoverBox!.dispatchEvent(pointer('pointerover', { buttons: 0 }))
    await sleep(60)
    hoverBox!.dispatchEvent(pointer('pointerleave', { bubbles: false, buttons: 0 }))
    tapBox!.dispatchEvent(pointer('pointerdown'))
    await sleep(40)
    window.dispatchEvent(pointer('pointerup', { buttons: 0 }))
    const r = dragBox!.getBoundingClientRect()
    const at = (dx: number) => ({ clientX: r.left + 20 + dx, clientY: r.top + 20 })
    dragBox!.dispatchEvent(pointer('pointerdown', at(0)))
    for (let i = 1; i <= 6; i++) {
      await sleep(16)
      window.dispatchEvent(pointer('pointermove', at(i * 10)))
    }
    window.dispatchEvent(pointer('pointerup', { ...at(60), buttons: 0 }))
  }
  // Parent-driven probes (Run button).
  createEffect(
    () => props.runToken,
    (_token, prev) => {
      if (prev === undefined)
        return
      void runLayout()
      void runExit()
      void simulate()
    },
  )

  const user = (e: Expect[Key], s: { fired: number; raw: number }, hint: string): Status =>
    s.raw === 0 ? 'todo' : e ? (s.fired > 0 ? 'PASS' : 'FAIL') : s.fired === 0 ? 'PASS' : 'FAIL'
  const hintFor = (s: { raw: number }, hint: string) => (s.raw === 0 ? hint : undefined)
  const probeStatus = (observed: boolean | undefined, expected: boolean): Status => (observed === undefined ? 'todo' : observed === expected ? 'PASS' : 'FAIL')
  const e = props.expect

  return (
    <section class="lg-col" data-bundle={props.name}>
      <h3>{props.name}</h3>
      <LazyMotion features={props.bundle}>
        <div class="lg-probes">
          <m.div ref={animBox} class="lg-box" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            animate
          </m.div>
          <m.div
            ref={hoverBox}
            class="lg-box"
            whileHover={{ scale: 1.25 }}
            onHoverStart={() => setHover(s => ({ ...s, fired: s.fired + 1 }))}
            onPointerEnter={() => setHover(s => ({ ...s, raw: s.raw + 1 }))}
          >
            hover
          </m.div>
          <m.div
            ref={tapBox}
            class="lg-box"
            whileTap={{ scale: 0.8 }}
            onTap={() => setTap(s => ({ ...s, fired: s.fired + 1 }))}
            onPointerDown={() => setTap(s => ({ ...s, raw: s.raw + 1 }))}
          >
            tap
          </m.div>
          <m.div
            ref={dragBox}
            class="lg-box"
            drag
            dragSnapToOrigin
            onDragStart={() => setDrag(s => ({ ...s, fired: s.fired + 1 }))}
            onPointerDown={() => setDrag(s => ({ ...s, raw: s.raw + 1 }))}
          >
            drag
          </m.div>
          <m.div
            class="lg-box"
            initial={{ opacity: 0.4 }}
            whileInView={{ opacity: 1 }}
            onViewportEnter={() => setInView(n => n + 1)}
          >
            inView
          </m.div>
        </div>
        <div class="lg-row">
          <m.div ref={layoutBox} layout class="lg-bar" style={{ width: wide() ? '160px' : '60px' }} />
          <div ref={exitHost} class="lg-exit">
            <AnimatePresence>
              <Show when={present()}>
                <m.div data-exit-box="" class="lg-box lg-small" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                  exit
                </m.div>
              </Show>
            </AnimatePresence>
          </div>
        </div>
        <div class="lg-row">
          <Button onClick={runLayout}>Layout probe</Button>
          <Button onClick={runExit}>Exit probe</Button>
          <Button onClick={simulate}>Simulate pointer</Button>
        </div>
      </LazyMotion>
      <table class="lg-table">
        <thead>
          <tr><th>feature</th><th>expected</th><th>observed</th><th>verdict</th></tr>
        </thead>
        <tbody>
          <Row
            label="animate"
            expected={e.animate}
            observed={animateOpacity() === undefined ? '...' : `opacity ${animateOpacity()!.toFixed(2)}`}
            status={probeStatus(animateOpacity() === undefined ? undefined : animateOpacity()! > 0.99, e.animate)}
          />
          <Row
            label="exit"
            expected={e.exit}
            observed={exitProbe() ?? '-'}
            status={probeStatus(exitProbe() === undefined ? undefined : exitProbe()!.startsWith('lingered') && exitProbe()!.includes('gone after'), e.exit)}
            hint="Exit probe"
          />
          <Row label="hover" expected={e.hover} observed={`onHoverStart ${hover().fired} / pointerenter ${hover().raw}`} status={user(e.hover, hover(), '')} hint={hintFor(hover(), 'hover the box')} />
          <Row label="tap" expected={e.tap} observed={`onTap ${tap().fired} / pointerdown ${tap().raw}`} status={user(e.tap, tap(), '')} hint={hintFor(tap(), 'click the box')} />
          <Row
            label="inView"
            expected={e.inview}
            observed={`onViewportEnter ${inView()}`}
            status={animateOpacity() === undefined ? 'todo' : e.inview ? (inView() > 0 ? 'PASS' : 'FAIL') : inView() === 0 ? 'PASS' : 'FAIL'}
            hint="wait"
          />
          <Row label="drag" expected={e.drag} observed={`onDragStart ${drag().fired} / pointerdown ${drag().raw}`} status={user(e.drag, drag(), '')} hint={hintFor(drag(), 'drag the box')} />
          <Row
            label="layout"
            expected={e.layout}
            observed={layoutProbe() ?? '-'}
            status={probeStatus(layoutProbe() === undefined ? undefined : layoutProbe()!.startsWith('animated'), e.layout)}
            hint="Layout probe"
          />
        </tbody>
      </table>
    </section>
  )
}

export default function Demo(): JSX.Element {
  const [token, setToken] = createSignal(0)
  return (
    <>
      <Controls>
        <Button onClick={() => setToken(value => value + 1)}>Run all probes (layout, exit, simulated pointer)</Button>
        <span>Or use each column's buttons and hover, click and drag the boxes yourself.</span>
      </Controls>
      <Stage height="200px" class="lg-stage">
        <For each={COLUMNS}>{c => <Column name={c.name} bundle={c.bundle} expect={c.expect} runToken={token()} />}</For>
        <style>{`
          .lg-stage{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}
          .lg-col h3{margin:0 0 8px}
          .lg-probes,.lg-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
          .lg-box{width:54px;height:54px;border-radius:8px;background:var(--box);color:#fff;font-size:11px;display:grid;place-items:center;touch-action:none;user-select:none}
          .lg-small{width:44px;height:44px}
          .lg-bar{height:24px;background:var(--info);border-radius:6px}
          .lg-exit{min-width:50px;min-height:46px}
          .lg-table{font-size:12px;border-collapse:collapse;width:100%}
          .lg-table th,.lg-table td{border-bottom:1px solid var(--border);padding:3px 4px;text-align:left}
          .lg-status{font-weight:600;color:var(--muted)}
          .lg-status[data-ok=true]{color:var(--ok)}
          .lg-status[data-ok=false]{color:var(--bad)}
        `}</style>
      </Stage>
    </>
  )
}
