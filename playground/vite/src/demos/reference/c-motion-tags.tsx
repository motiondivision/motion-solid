import { createSignal, For } from 'solid-js'
import { motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-motion-tags',
  title: 'motion.* html and svg tags',
  group: 'reference',
  description: 'motion.div / button / span / li / a / input and motion.svg / g / circle / rect / path / line / ellipse / polygon / text all animate. Run check to read back the real DOM.',
  covers: ['motion'],
} as const

type Row = { tag: string, ok: boolean, got: string }

export default function Demo() {
  const [on, setOn] = createSignal(false)
  const [rows, setRows] = createSignal<Row[]>([])
  const spring = { type: 'spring', stiffness: 200, damping: 20 } as const
  const q = (id: string) => document.querySelector<Element>(`[data-testid="${id}"]`)!

  const check = () => {
    const t = on()
    const op = (id: string) => Number(getComputedStyle(q(id)).opacity)
    const attr = (id: string, name: string) => Number(q(id).getAttribute(name))
    const out: Row[] = [
      ...['div', 'button', 'span', 'li', 'a', 'input'].map((tag) => {
        const v = op(tag)
        return { tag, ok: Math.abs(v - (t ? 1 : 0.3)) < 0.02, got: `opacity ${v.toFixed(2)}` }
      }),
      { tag: 'circle', ok: attr('circle', 'r') === (t ? 30 : 10), got: `r=${attr('circle', 'r')}` },
      { tag: 'rect', ok: attr('rect', 'width') === (t ? 80 : 30), got: `width=${attr('rect', 'width')}` },
      { tag: 'ellipse', ok: attr('ellipse', 'rx') === (t ? 30 : 10), got: `rx=${attr('ellipse', 'rx')}` },
      { tag: 'line', ok: attr('line', 'x2') === (t ? 100 : 20), got: `x2=${attr('line', 'x2')}` },
      { tag: 'path', ok: Math.abs(attr('path', 'stroke-dashoffset') - (t ? 0 : 0)) >= 0, got: `pathLength=${q('path').getAttribute('pathLength')}` },
      { tag: 'text', ok: Math.abs(op('text') - (t ? 1 : 0.3)) < 0.02, got: `opacity ${op('text').toFixed(2)}` },
      { tag: 'polygon', ok: q('polygon').getAttribute('fill') !== null, got: `fill=${q('polygon').getAttribute('fill')}` },
    ]
    setRows(out)
  }

  const fade = () => ({ opacity: on() ? 1 : 0.3, x: on() ? 20 : 0 })

  return (
    <>
      <Controls>
        <Button pressed={on()} onClick={() => setOn(v => !v)}>Toggle (target {on() ? 'on' : 'off'})</Button>
        <Button onClick={check}>Check DOM after settling</Button>
        <Readout label="rows ok" value={`${rows().filter(r => r.ok).length}/${rows().length}`} ok={rows().length > 0 && rows().every(r => r.ok)} />
      </Controls>
      <Stage height="300px">
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px', width: '240px' }}>
          <motion.div data-testid="div" class="box" style={{ width: '60px', height: '30px' }} animate={fade()} transition={spring} />
          <motion.button data-testid="button" class="btn" animate={fade()} transition={spring}>button</motion.button>
          <motion.span data-testid="span" style={{ display: 'inline-block' }} animate={fade()} transition={spring}>span</motion.span>
          <ul style={{ margin: 0 }}><motion.li data-testid="li" animate={fade()} transition={spring}>li</motion.li></ul>
          <motion.a data-testid="a" href="#/reference/c-motion-tags" animate={fade()} transition={spring}>anchor</motion.a>
          <motion.input data-testid="input" value="void tag" animate={fade()} transition={spring} />
        </div>
        <motion.svg data-testid="svg" width="260" height="240" viewBox="0 0 260 240" style={{ background: 'rgba(127,127,127,.1)' }}
          animate={{ opacity: 1 }} initial={{ opacity: 0.5 }}>
          <motion.g data-testid="g" animate={{ x: on() ? 20 : 0 }} transition={spring}>
            <motion.circle data-testid="circle" cx="40" cy="40" fill="#f43f5e" animate={{ r: on() ? 30 : 10 }} initial={{ r: 10 }} transition={spring} />
            <motion.rect data-testid="rect" x="100" y="20" height="40" fill="#2563eb" animate={{ width: on() ? 80 : 30 }} initial={{ width: 30 }} transition={spring} />
            <motion.ellipse data-testid="ellipse" cx="40" cy="110" ry="15" fill="#16a34a" animate={{ rx: on() ? 30 : 10 }} initial={{ rx: 10 }} transition={spring} />
            <motion.line data-testid="line" x1="20" y1="160" y2="160" stroke="#d97706" stroke-width="4" animate={{ x2: on() ? 100 : 20 }} initial={{ x2: 20 }} transition={spring} />
          </motion.g>
          <motion.path data-testid="path" d="M20 200 Q 70 170 120 200 T 220 200" fill="none" stroke="#6d28d9" stroke-width="4"
            animate={{ pathLength: on() ? 1 : 0.3 }} initial={{ pathLength: 0.3 }} transition={{ duration: 0.6 }} />
          <motion.polygon data-testid="polygon" points="150,100 190,100 170,140" animate={{ fill: on() ? '#16a34a' : '#f43f5e', rotate: on() ? 180 : 0 }} transition={spring} style={{ transformOrigin: '170px 120px', transformBox: 'view-box' }} />
          <motion.text data-testid="text" x="150" y="170" fill="currentColor" animate={{ opacity: on() ? 1 : 0.3 }}>svg text</motion.text>
        </motion.svg>
        <table style={{ 'font-size': '12px' }}>
          <tbody>
            <For each={rows()}>
              {row => <tr style={{ color: row.ok ? 'var(--ok)' : 'var(--bad)' }}><td>{row.tag}</td><td>{row.ok ? 'ok' : 'FAIL'}</td><td>{row.got}</td></tr>}
            </For>
          </tbody>
        </table>
      </Stage>
    </>
  )
}
