import { createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import {
  alpha,
  clamp,
  color,
  complex,
  degrees,
  distance,
  distance2D,
  hex,
  hsla,
  interpolate,
  isNear,
  millisecondsToSeconds,
  mix,
  mixColor,
  mixComplex,
  mixNumber,
  number,
  percent,
  pipe,
  progress,
  px,
  rgba,
  round,
  secondsToMilliseconds,
  transform,
  velocityPerSecond,
  vh,
  vw,
  wrap,
} from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'p-math',
  title: 'Math helpers and value types',
  group: 'reference',
  description:
    'clamp, wrap, progress, mix (numbers, colours, complex strings), interpolate, transform, pipe, distance, round, velocityPerSecond, unit conversion and the value types (px, percent, degrees, vw, vh, alpha, number, rgba, hsla, hex, color, complex). Every row shows the helper result, an independently computed expectation and a pass cue.',
  covers: [
    'alpha',
    'clamp',
    'color',
    'complex',
    'degrees',
    'distance',
    'distance2D',
    'hex',
    'hsla',
    'interpolate',
    'isNear',
    'millisecondsToSeconds',
    'mix',
    'mixColor',
    'mixComplex',
    'mixNumber',
    'number',
    'percent',
    'pipe',
    'progress',
    'px',
    'rgba',
    'round',
    'secondsToMilliseconds',
    'transform',
    'velocityPerSecond',
    'vh',
    'vw',
    'wrap',
  ],
} as const

type Row = { label: string; got: () => unknown; expected: () => unknown }

const same = (a: unknown, b: unknown) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-6 : JSON.stringify(a) === JSON.stringify(b))
const show = (value: unknown) => (typeof value === 'number' ? String(Math.round(value * 10000) / 10000) : typeof value === 'string' ? value : JSON.stringify(value))

export default function Demo() {
  const [v, setV] = createSignal(25)
  const [t, setT] = createSignal(0.5)
  const [lo, setLo] = createSignal(0)
  const [hi, setHi] = createSignal(100)
  const [ax, setAx] = createSignal(0)
  const [ay, setAy] = createSignal(0)
  const [bx, setBx] = createSignal(30)
  const [by, setBy] = createSignal(40)
  const [css, setCss] = createSignal('rgba(10, 20, 30, 0.5)')

  const rows: Row[] = [
    { label: 'clamp(lo, hi, v)', got: () => clamp(lo(), hi(), v()), expected: () => Math.min(Math.max(v(), lo()), hi()) },
    { label: 'wrap(lo, hi, v)', got: () => wrap(lo(), hi(), v()), expected: () => { const r = hi() - lo(); return r === 0 ? lo() : ((((v() - lo()) % r) + r) % r) + lo() } },
    { label: 'progress(lo, hi, v)', got: () => progress(lo(), hi(), v()), expected: () => (hi() === lo() ? 1 : (v() - lo()) / (hi() - lo())) },
    { label: 'mix(lo, hi, t)', got: () => mix(lo(), hi(), t()), expected: () => lo() + (hi() - lo()) * t() },
    { label: 'mixNumber(lo, hi, t)', got: () => mixNumber(lo(), hi(), t()), expected: () => lo() + (hi() - lo()) * t() },
    { label: "mix('#f00','#00f')(t)", got: () => mix('#ff0000', '#0000ff')(t()), expected: () => mixColor('#ff0000', '#0000ff')(t()) },
    { label: "mixColor('#f00','#00f')(t)", got: () => mixColor('#ff0000', '#0000ff')(t()), expected: () => { const c = Math.round(Math.sqrt(255 * 255 * (1 - t()))); const d = Math.round(Math.sqrt(255 * 255 * t())); return `rgba(${c}, 0, ${d}, 1)` } },
    { label: "mixComplex('0px 10px','100px 20px')(t)", got: () => mixComplex('0px 10px', '100px 20px')(t()), expected: () => `${100 * t()}px ${10 + 10 * t()}px` },
    { label: 'interpolate([lo,hi],[0,360])(v)', got: () => interpolate([lo(), hi()], [0, 360])(v()), expected: () => clamp(0, 360, ((v() - lo()) / (hi() - lo())) * 360) },
    { label: 'transform([lo,hi],[0,360],{clamp:false})(v)', got: () => transform([lo(), hi()], [0, 360], { clamp: false })(v()), expected: () => ((v() - lo()) / (hi() - lo())) * 360 },
    { label: 'pipe(+1, *2, round)(v)', got: () => pipe((n: number) => n + 1, (n: number) => n * 2, Math.round)(v()), expected: () => Math.round((v() + 1) * 2) },
    { label: 'distance(a.x, b.x)', got: () => distance(ax(), bx()), expected: () => Math.abs(bx() - ax()) },
    { label: 'distance2D(a, b)', got: () => distance2D({ x: ax(), y: ay() }, { x: bx(), y: by() }), expected: () => Math.hypot(bx() - ax(), by() - ay()) },
    { label: 'round(v / 7)', got: () => round(v() / 7), expected: () => Math.round((v() / 7) * 100000) / 100000 },
    { label: 'isNear(v, 25, 1)', got: () => isNear(v(), 25, 1), expected: () => Math.abs(v() - 25) <= 1 },
    { label: 'velocityPerSecond(v, 250ms)', got: () => velocityPerSecond(v(), 250), expected: () => (v() * 1000) / 250 },
    { label: 'secondsToMilliseconds(t)', got: () => secondsToMilliseconds(t()), expected: () => t() * 1000 },
    { label: 'millisecondsToSeconds(v)', got: () => millisecondsToSeconds(v()), expected: () => v() / 1000 },
    { label: 'px.transform(v)', got: () => px.transform(v()), expected: () => `${v()}px` },
    { label: 'percent.transform(v)', got: () => percent.transform(v()), expected: () => `${v()}%` },
    { label: 'degrees.transform(v)', got: () => degrees.transform(v()), expected: () => `${v()}deg` },
    { label: 'vw.transform(v) / vh.transform(v)', got: () => `${vw.transform(v())} ${vh.transform(v())}`, expected: () => `${v()}vw ${v()}vh` },
    { label: 'alpha.transform / number.transform', got: () => `${alpha.transform(t())} ${number.transform(v())}`, expected: () => `${t()} ${v()}` },
    { label: 'px.parse("12px") + percent.test("5%")', got: () => `${px.parse('12px')} ${percent.test('5%')}`, expected: () => '12 true' },
    { label: 'hex.parse("#abc")', got: () => hex.parse('#abc'), expected: () => ({ red: 170, green: 187, blue: 204, alpha: 1 }) },
    { label: 'hsla.parse("hsl(120, 100%, 50%)")', got: () => hsla.parse('hsl(120, 100%, 50%)'), expected: () => ({ hue: 120, saturation: 100, lightness: 50, alpha: 1 }) },
    { label: 'rgba.transform({10,20,30,.5})', got: () => rgba.transform({ red: 10, green: 20, blue: 30, alpha: 0.5 }), expected: () => 'rgba(10, 20, 30, 0.5)' },
    { label: 'color.test + color.parse(text box)', got: () => `${color.test(css())} ${show(color.parse(css()))}`, expected: () => 'true {"red":10,"green":20,"blue":30,"alpha":0.5}' },
    { label: 'complex.parse + createTransformer', got: () => complex.createTransformer('10px 20px')(complex.parse('5px 6px') as number[]), expected: () => '5px 6px' },
  ]

  const slider = (label: string, min: number, max: number, step: number, value: number, onInput: (value: number) => void) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={event => onInput(Number(event.currentTarget.value))} />
    </label>
  )

  return (
    <>
      <Controls>
        {slider('v', -50, 250, 1, v(), setV)}
        {slider('t', 0, 1, 0.05, t(), setT)}
        {slider('lo', -100, 100, 1, lo(), setLo)}
        {slider('hi', -100, 300, 1, hi(), setHi)}
        <Readout label="v / t / lo / hi" value={`${v()} / ${t()} / ${lo()} / ${hi()}`} />
      </Controls>
      <Controls>
        {slider('a.x', 0, 100, 1, ax(), setAx)}
        {slider('a.y', 0, 100, 1, ay(), setAy)}
        {slider('b.x', 0, 100, 1, bx(), setBx)}
        {slider('b.y', 0, 100, 1, by(), setBy)}
        <label>
          colour string <input type="text" aria-label="colour string" value={css()} onInput={event => setCss(event.currentTarget.value)} style={{ width: '220px' }} />
        </label>
      </Controls>
      <table data-testid="math-table" style={{ 'border-collapse': 'collapse', 'font-size': '13px', width: '100%' }}>
        <tbody>
          <For each={rows}>
            {row => {
              const ok = () => same(row.got(), row.expected())
              return (
                <tr data-ok={ok() ? 'true' : 'false'} style={{ background: ok() ? 'transparent' : '#fee2e2' }}>
                  <td style={{ padding: '2px 8px', 'font-family': 'monospace' }}>{row.label}</td>
                  <td style={{ padding: '2px 8px', 'font-family': 'monospace' }}>{show(row.got())}</td>
                  <td style={{ padding: '2px 8px', color: 'var(--muted, #64748b)', 'font-family': 'monospace' }}>{show(row.expected())}</td>
                  <td style={{ padding: '2px 8px' }}>{ok() ? 'ok' : 'MISMATCH'}</td>
                </tr>
              )
            }}
          </For>
        </tbody>
      </table>
    </>
  )
}
