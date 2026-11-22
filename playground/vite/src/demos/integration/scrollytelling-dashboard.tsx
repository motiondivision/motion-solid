import { createEffect, createSignal, For } from 'solid-js'
import {
  animate,
  createDomRef,
  createMotionValue,
  createMotionValueEvent,
  createReducedMotionConfig,
  createScroll,
  createSpring,
  createTransform,
  motion,
  MotionConfig,
  RowValue,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'scrollytelling-dashboard',
  title: 'Scrollytelling dashboard',
  group: 'integration',
  description:
    'Scroll the panel: a spring-smoothed progress bar, KPI counters that count up with animate() when whileInView triggers, an SVG line chart drawn by pathLength and bars scaled by a section-scoped createScroll. Reduced motion makes counters jump and drops the entrance transforms.',
  covers: [
    'MotionConfig',
    'RowValue',
    'animate',
    'createDomRef',
    'createMotionValue',
    'createMotionValueEvent',
    'createReducedMotionConfig',
    'createScroll',
    'createSpring',
    'createTransform',
    'motion',
  ],
  level: 4,
} as const

const KPIS = [
  { label: 'Revenue ($k)', target: 1280 },
  { label: 'Users', target: 48210 },
  { label: 'Uptime (x10 %)', target: 999 },
]
const BARS = [40, 70, 55, 95, 80, 110]
const LINE = 'M10 140 L70 100 L130 115 L190 60 L250 80 L310 30 L390 45'

function Counter(props: { label: string; target: number; replay: number; reduced: () => boolean; root: () => HTMLElement | undefined }) {
  const value = createMotionValue(0)
  const [shown, setShown] = createSignal(0)
  let controls: { stop: () => void } | undefined
  createMotionValueEvent(value, 'change', latest => setShown(Math.round(latest)))
  const run = (reduced: boolean) => {
    controls?.stop()
    value.set(0)
    if (reduced) value.set(props.target)
    else controls = animate(value, props.target, { duration: 1.4, ease: 'easeOut' })
  }
  createEffect(
    () => [props.replay, props.reduced()] as const,
    ([, reduced]) => { run(reduced) },
    { defer: true },
  )
  return (
    <motion.div
      class="sd-kpi"
      data-testid={`kpi-${props.label.split(' ')[0]}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: props.root(), amount: 0.6 }}
      onViewportEnter={() => run(props.reduced())}
      onViewportLeave={() => value.set(0)}
    >
      <small>{props.label}</small>
      <strong data-testid={`kpi-value-${props.label.split(' ')[0]}`}>{shown()}</strong>
    </motion.div>
  )
}

function Dashboard(props: { replay: number; onScroller: (el: HTMLElement | undefined) => void }) {
  const reduced = createReducedMotionConfig()
  const [scroller, scrollerRef] = createDomRef<HTMLDivElement>()
  const [chartSection, chartRef] = createDomRef<HTMLElement>()
  const page = createScroll({ container: scroller })
  const chart = createScroll({ container: scroller, target: chartSection, offset: ['start end', 'end center'] })
  const bar = createSpring(page.scrollYProgress, { stiffness: 120, damping: 25 })
  const pct = createTransform(page.scrollYProgress, v => Math.round(v * 100) + '%')
  const drawn = createTransform(chart.scrollYProgress, v => Math.round(v * 100) + '%')
  const barScales = BARS.map((_, i) => createTransform(chart.scrollYProgress, [i * 0.08, 0.55 + i * 0.08], [0, 1]))
  createEffect(scroller, (el) => { props.onScroller(el) })

  return (
    <div class="sd-scroll" ref={scrollerRef} data-testid="scroller">
      <motion.div class="sd-bar" data-testid="bar" style={{ scaleX: bar }} />
      <div class="sd-stats">
        <Readout label="page progress" value={<RowValue value={pct} />} />
        <Readout label="chart drawn" value={<RowValue value={drawn} />} />
        <Readout label="reduced" value={String(reduced())} ok={!reduced()} />
      </div>
      <section class="sd-sec">
        <h3>1. Key numbers</h3>
        <div class="sd-kpis">
          <For each={KPIS}>
            {k => <Counter label={k.label} target={k.target} replay={props.replay} reduced={reduced} root={scroller} />}
          </For>
        </div>
      </section>
      <section class="sd-sec" ref={chartRef} data-testid="chart-section">
        <h3>2. Growth (drawn with scroll)</h3>
        <svg viewBox="0 0 400 160" class="sd-chart">
          <For each={BARS}>
            {(h, i) => (
              <motion.rect
                data-testid={`bar-${i()}`}
                x={20 + i() * 60}
                y={150 - h}
                width="30"
                height={h}
                fill="var(--info)"
                opacity="0.35"
                style={{ scaleY: barScales[i()], transformOrigin: '50% 100%', transformBox: 'fill-box' }}
              />
            )}
          </For>
          <motion.path data-testid="line" d={LINE} fill="none" stroke="var(--box)" stroke-width="4" stroke-linecap="round" style={{ pathLength: chart.scrollYProgress }} />
        </svg>
      </section>
      <section class="sd-sec">
        <h3>3. Highlights (whileInView)</h3>
        <div class="sd-cards">
          <For each={['Fast', 'Small', 'Typed', 'Reactive']}>
            {(name, i) => (
              <motion.div
                class="sd-card"
                data-testid={`card-${i()}`}
                initial={{ opacity: 0, x: i() % 2 ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ root: scroller(), amount: 0.8 }}
              >
                {name}
              </motion.div>
            )}
          </For>
        </div>
      </section>
    </div>
  )
}

export default function Demo() {
  const [mode, setMode] = createSignal<'inherit' | 'never' | 'user' | 'always'>('inherit')
  const [replay, setReplay] = createSignal(0)
  const [scroller, setScroller] = createSignal<HTMLElement>()
  const to = (top: number) => scroller()?.scrollTo({ top, behavior: 'instant' })

  return (
    <>
      <Controls>
        <label>
          reduced motion
          <select aria-label="Local reduced motion" value={mode()} onChange={e => setMode(e.currentTarget.value as any)}>
            <option value="inherit">inherit (shell)</option>
            <option value="never">never</option>
            <option value="user">user</option>
            <option value="always">always</option>
          </select>
        </label>
        <Button onClick={() => setReplay(n => n + 1)}>Replay counters</Button>
        <Button onClick={() => to(0)}>Top</Button>
        <Button onClick={() => to(99999)}>Bottom</Button>
      </Controls>
      <Stage height="520px">
        <MotionConfig reducedMotion={mode() === 'inherit' ? undefined : (mode() as 'user' | 'always' | 'never')}>
          <Dashboard replay={replay()} onScroller={setScroller} />
        </MotionConfig>
      </Stage>
      <style>{`
        .sd-scroll { position: relative; width: 100%; height: 480px; overflow-y: auto; }
        .sd-bar { position: sticky; top: 0; height: 6px; background: var(--accent); transform-origin: 0 50%; z-index: 4; }
        .sd-stats { position: sticky; top: 10px; display: flex; gap: 8px; flex-wrap: wrap; z-index: 3; margin: 6px 0; }
        .sd-sec { min-height: 420px; padding: 8px 4px; }
        .sd-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .sd-kpi { border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: grid; gap: 4px; background: var(--bg); }
        .sd-kpi strong { font-size: 28px; font-variant-numeric: tabular-nums; }
        .sd-chart { width: 100%; max-width: 560px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); }
        .sd-cards { display: grid; gap: 14px; margin-top: 8px; }
        .sd-card { background: var(--ok); color: #fff; padding: 36px 16px; border-radius: 10px; font-size: 20px; }
      `}</style>
    </>
  )
}
