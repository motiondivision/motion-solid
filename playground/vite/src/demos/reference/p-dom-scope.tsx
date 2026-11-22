import { Show, createSignal } from 'solid-js'
import { For } from '@solidjs/web'
import { animate, createAnimationFrame, createDomRef, createScopeMotion, stagger } from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'p-dom-scope',
  title: 'createDomRef + createScopeMotion',
  group: 'reference',
  description:
    'createDomRef gives a reactive element accessor (switch the ref between two elements); createScopeMotion runs animate() calls inside a scope bound to it. Re-run, stop (keeps styles) or cancel (restores styles) the scope, and narrow the window below 1000px to flip the matchMedia condition.',
  covers: ['animate', 'createAnimationFrame', 'createDomRef', 'createScopeMotion', 'stagger'],
} as const

const ITEMS = [0, 1, 2, 3, 4]

export default function Demo() {
  const [first, setFirst] = createSignal(true)
  const [element, ref] = createDomRef<HTMLDivElement>()
  const [runs, setRuns] = createSignal(0)

  const scope = createScopeMotion(
    element,
    ({ media }) => {
      setRuns(n => n + 1)
      // Selectors resolve inside the scope's root element only.
      animate('.ps-item', { x: media.wide ? 160 : 60, opacity: [0.3, 1] }, { delay: stagger(0.08), duration: 0.5 })
      return () => setRuns(n => n) // cleanup hook: runs on cancel / re-run
    },
    { transition: { ease: 'easeOut' }, matchMedia: { wide: '>=1000' } },
  )

  const [live, setLive] = createSignal({ state: 'none', wide: '-' })
  createAnimationFrame(() => {
    const s = scope()
    setLive({ state: s ? s.state : 'none', wide: s ? String(s.media.wide) : '-' })
  })

  const items = () => (
    <For each={ITEMS}>{index => <div class="ps-item" data-index={index} style={{ width: '30px', height: '14px', background: 'var(--info)', 'border-radius': '4px', 'margin-bottom': '4px' }} />}</For>
  )

  return (
    <>
      <Controls>
        <Button onClick={() => setFirst(value => !value)}>Move ref to the {first() ? 'second' : 'first'} root</Button>
        <Button onClick={() => scope()?.refresh()}>scope.refresh()</Button>
        <Button onClick={() => scope()?.stop()}>scope.stop()</Button>
        <Button onClick={() => scope()?.cancel()}>scope.cancel()</Button>
      </Controls>
      <Controls>
        <Readout label="element()" value={element() ? `${element()!.tagName.toLowerCase()}#${element()!.id}` : 'undefined'} />
        <Readout label="scope state" value={live().state} ok={live().state === 'active'} />
        <Readout label="media.wide (>=1000)" value={live().wide} />
        <Readout label="setup runs" value={runs()} />
      </Controls>
      <div style={{ display: 'flex', gap: '24px' }}>
        <Show when={first()} fallback={<div id="root-b" style={{ width: '260px', 'min-height': '100px' }}>root B (inactive)</div>}>
          <div id="root-a" ref={ref} data-testid="root-a" style={{ width: '260px', 'min-height': '100px' }}>
            root A
            {items()}
          </div>
        </Show>
        <Show when={!first()} fallback={<div id="root-b0" style={{ width: '260px', 'min-height': '100px' }}>root B (inactive)</div>}>
          <div id="root-b" ref={ref} data-testid="root-b" style={{ width: '260px', 'min-height': '100px' }}>
            root B
            {items()}
          </div>
        </Show>
      </div>
    </>
  )
}
