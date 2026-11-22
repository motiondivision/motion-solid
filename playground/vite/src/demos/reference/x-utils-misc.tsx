import { createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import { addUniqueItem, hasWarned, invariant, isObject, moveItem, noop, removeItem, toMediaQuery, warnOnce, warning } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-utils-misc',
  title: 'Small utilities: array helpers, warnings, invariant, toMediaQuery',
  group: 'reference',
  description:
    'addUniqueItem / removeItem / moveItem on a list you can edit, isObject and noop probes, the dev warnings warning() and warnOnce() (with hasWarned) and invariant() (throws), and toMediaQuery() for a condition you type, evaluated live with matchMedia.',
  covers: ['addUniqueItem', 'hasWarned', 'invariant', 'isObject', 'moveItem', 'noop', 'removeItem', 'toMediaQuery', 'warnOnce', 'warning'],
  expects: ['playground: warnOnce() fired'],
} as const

const processType = typeof (globalThis as Record<string, unknown>).process

const safe = (fn: () => unknown): string => {
  try {
    const out = fn()
    return typeof out === 'string' ? out : JSON.stringify(out) ?? String(out)
  } catch (error) {
    return 'ERR ' + (error as Error).message
  }
}

export default function Demo() {
  const [items, setItems] = createSignal(['a', 'b', 'c', 'd'])
  const [counter, setCounter] = createSignal(0)
  const [condition, setCondition] = createSignal('>=800 !touch')
  const [warned, setWarned] = createSignal('no')
  const [invariantResult, setInvariantResult] = createSignal('not run')
  const edit = (change: (copy: string[]) => void) => {
    const copy = [...items()]
    change(copy)
    setItems(copy)
  }
  return (
    <>
      <h4>Array helpers</h4>
      <Controls>
        <Button onClick={() => edit(copy => { setCounter(n => n + 1); addUniqueItem(copy, `n${counter() + 1}`) })}>addUniqueItem(new)</Button>
        <Button onClick={() => edit(copy => addUniqueItem(copy, 'a'))}>addUniqueItem('a') (no duplicate)</Button>
        <Button onClick={() => edit(copy => removeItem(copy, 'b'))}>removeItem('b')</Button>
        <Button onClick={() => setItems(moveItem(items(), 0, items().length - 1))}>moveItem(first, last)</Button>
        <Button onClick={() => setItems(['a', 'b', 'c', 'd'])}>reset</Button>
      </Controls>
      <div data-testid="items" style={{ display: 'flex', gap: '6px' }}>
        <For each={items()}>{item => <span class="box" style={{ padding: '4px 10px', width: 'auto', height: 'auto' }}>{item}</span>}</For>
      </div>
      <Readout label="items" value={items().join(', ')} />
      <h4>Probes</h4>
      <Readout label="isObject({}) / ([]) / (null) / ('s')" value={`${isObject({})} / ${isObject([])} / ${isObject(null)} / ${isObject('s')}`} />
      <Readout label="noop(42)" value={String(noop(42))} ok={noop(42) === 42} />
      <h4>Warnings</h4>
      <Controls>
        <Button
          onClick={() => {
            // Intercept console.warn so the probe shows whether warning() is active without polluting the console.
            const original = console.warn
            let logged = false
            console.warn = () => { logged = true }
            try { warning(false, 'playground: warning() fired') } finally { console.warn = original }
            setWarned(`warning(false, ...) logged: ${logged} (motion-utils enables it only when a global process exists; typeof process = ${processType})`)
          }}
        >
          warning(false, ...)
        </Button>
        <Button onClick={() => { warnOnce(false, 'playground: warnOnce() fired'); setWarned(`warnOnce(false, ...) called, hasWarned = ${hasWarned('playground: warnOnce() fired')}`) }}>warnOnce(false, ...) (only the first click logs)</Button>
        <Button onClick={() => setInvariantResult(safe(() => { invariant(false, 'playground invariant message'); return `did not throw (typeof process = ${processType})` }))}>invariant(false, ...)</Button>
      </Controls>
      <Readout label="warning state" value={warned()} />
      <Readout label="hasWarned(unknown message)" value={String(hasWarned('playground: never logged'))} ok={!hasWarned('playground: never logged')} />
      <Readout label="invariant" value={invariantResult()} />
      <h4>toMediaQuery</h4>
      <Controls>
        <label>
          condition <input aria-label="condition" data-testid="condition" value={condition()} onInput={event => setCondition(event.currentTarget.value)} />
        </label>
      </Controls>
      <Readout label="toMediaQuery(condition)" value={safe(() => toMediaQuery(condition()))} />
      <Readout label="matches now" value={safe(() => String(window.matchMedia(toMediaQuery(condition())).matches))} />
      <Readout label="'reducedMotion' / 'dark hover'" value={`${toMediaQuery('reducedMotion')} | ${toMediaQuery('dark hover')}`} />
    </>
  )
}
