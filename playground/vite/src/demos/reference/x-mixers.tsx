import { createSignal } from 'solid-js'
import { getMixer, mixArray, mixImmediate, mixLinearColor, mixObject, mixValues, mixVisibility } from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-mixers',
  title: 'Mixers: getMixer, mixArray, mixObject, mixImmediate, mixVisibility, mixLinearColor',
  group: 'reference',
  description: 'Drag the progress slider: every mixer blends two values (colors, numbers, arrays, objects, complex strings, visibility) and the swatches show the result.',
  covers: ['getMixer', 'mixArray', 'mixImmediate', 'mixLinearColor', 'mixObject', 'mixValues', 'mixVisibility'],
} as const

const safe = (fn: () => unknown): string => {
  try {
    const out = fn()
    return typeof out === 'string' ? out : JSON.stringify(out) ?? String(out)
  } catch (error) {
    return 'ERR ' + (error as Error).message
  }
}

export default function Demo() {
  const [p, setP] = createSignal(0.5)
  const color = () => (getMixer('#ff0000') as (a: string, b: string) => (p: number) => string)('#ff0000', '#0000ff')(p())
  const mixedObject = () => mixObject({ x: 0, c: 'rgb(255, 0, 0)' }, { x: 100, c: 'rgb(0, 0, 255)' })(p())
  return (
    <>
      <Controls>
        <label>
          progress{' '}
          <input type="range" aria-label="progress" min="0" max="1" step="0.05" value={p()} onInput={event => setP(Number(event.currentTarget.value))} />
        </label>
        <Readout label="p" value={p().toFixed(2)} />
      </Controls>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div data-testid="swatch-color" style={{ width: '60px', height: '40px', background: color() }} />
        <div data-testid="swatch-object" style={{ width: '60px', height: '40px', background: String(mixedObject().c), 'margin-left': `${Number(mixedObject().x)}px` }} />
      </div>
      <Readout label="getMixer(color)(red, blue)(p)" value={color()} />
      <Readout label="getMixer(number)(0, 100)(p)" value={safe(() => (getMixer(0) as (a: number, b: number) => (p: number) => number)(0, 100)(p()))} />
      <Readout label="getMixer('0px 0px')('0px 0px','10px 20px')(p)" value={safe(() => (getMixer('0px 0px') as (a: string, b: string) => (p: number) => string)('0px 0px', '10px 20px')(p()))} />
      <Readout label="mixArray([0, 10], [100, 20])(p)" value={safe(() => mixArray([0, 10], [100, 20])(p()))} />
      <Readout label="mixObject" value={safe(mixedObject)} />
      <Readout label="mixImmediate('a', 'b')(p)" value={String(mixImmediate('a', 'b')(p()))} />
      <Readout label="mixVisibility('hidden', 'visible')(p)" value={mixVisibility('hidden', 'visible')(p())} />
      <Readout
        label="mixValues(target, follow, lead, p, crossfade, false)"
        value={safe(() => {
          const out: Record<string, unknown> = {}
          mixValues(out as never, { opacity: 0, x: 0 } as never, { opacity: 1, x: 100 } as never, p(), true, false)
          return out
        })}
      />
      <Readout label="mixLinearColor(0, 255, p)" value={mixLinearColor(0, 255, p()).toFixed(1)} />
    </>
  )
}
