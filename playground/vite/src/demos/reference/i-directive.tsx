import { createSignal, Show } from 'solid-js'
import { attachMotion, createAttachMotion, createPresetMotion, domMax, domMin, makeMotion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-directive',
  title: 'attachMotion, makeMotion and presets',
  group: 'reference',
  description: 'attachMotion on plain elements (static and reactive options), createAttachMotion with domMin and domMax, createPresetMotion with per-use overrides, and makeMotion: the imperative form that attaches to an element you create yourself, either unowned (call the returned function to stop) or in a component body (removed with the component).',
  covers: ['attachMotion', 'createAttachMotion', 'createPresetMotion', 'domMax', 'domMin', 'makeMotion'],
} as const

const minimal = createAttachMotion(domMin)
const full = createAttachMotion(domMax, { transition: { duration: 0.6 } })
const fadeIn = createPresetMotion({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } })

const base = { width: '90px', height: '90px', 'border-radius': '12px', background: 'var(--box)', color: '#fff', padding: '6px', 'font-size': '12px' } as const

/** An element made outside the JSX, as a third-party widget would hand you one. */
function makeWidgetElement(label: string, background: string) {
  const el = document.createElement('div')
  el.textContent = label
  Object.assign(el.style, { width: '90px', height: '90px', borderRadius: '12px', background, color: '#fff', padding: '6px', fontSize: '12px' })
  return el
}

/** makeMotion in a component body: removed automatically when the component is disposed. */
function OwnedWidget() {
  const el = makeWidgetElement('makeMotion in a component body', '#0ea5e9')
  makeMotion(el, { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, whileHover: { scale: 1.2 } })
  return el
}

export default function Demo() {
  const [x, setX] = createSignal(0)
  const [hovered, setHovered] = createSignal(false)
  // makeMotion outside any owner (an event handler): keep the returned function to stop it.
  let host!: HTMLDivElement
  let widget: HTMLElement | undefined
  let stop: VoidFunction | undefined
  const [attached, setAttached] = createSignal(false)
  const [owned, setOwned] = createSignal(false)
  const attach = () => {
    if (stop)
      return
    widget = makeWidgetElement('makeMotion unowned', '#84cc16')
    widget.dataset.testid = 'd-make'
    host.appendChild(widget)
    stop = makeMotion(widget, { initial: { opacity: 0.2 }, animate: { opacity: 1, rotate: 15 }, whileHover: { scale: 1.3 }, transition: { duration: 0.6 } })
    setAttached(true)
  }
  const detach = () => {
    stop?.()
    stop = undefined
    widget?.remove()
    widget = undefined
    setAttached(false)
  }
  return (
    <>
      <Controls>
        <Button onClick={() => setX(v => (v === 0 ? 160 : 0))}>Toggle x (reactive attachMotion)</Button>
        <Readout label="x state" value={x()} />
        <Readout label="domMin hover (should stay false)" value={String(hovered())} />
        <Button onClick={attach} disabled={attached()}>makeMotion on a new element</Button>
        <Button onClick={detach} disabled={!attached()}>Stop and remove it</Button>
        <Readout label="unowned makeMotion attached" value={String(attached())} ok={attached()} />
        <Button onClick={() => setOwned(v => !v)} pressed={owned()}>Toggle owned widget (body)</Button>
      </Controls>
      <Stage height="260px">
        <div data-testid="d-static" style={base} ref={attachMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })}>attachMotion static</div>
        <div data-testid="d-reactive" style={{ ...base, background: '#f59e0b' }} ref={attachMotion(() => ({ animate: { x: x() } }))}>attachMotion reactive</div>
        <div data-testid="d-min" style={{ ...base, background: '#14b8a6' }} ref={minimal({ animate: { rotate: 20 }, whileHover: { scale: 1.3 }, onHoverStart: () => setHovered(true) })}>domMin: animate only</div>
        <div data-testid="d-max" style={{ ...base, background: '#6366f1' }} ref={full({ whileHover: { scale: 1.3 }, drag: true, dragMomentum: false })}>domMax: hover + drag</div>
        <div data-testid="d-preset" style={{ ...base, background: '#ec4899' }} ref={fadeIn()}>preset</div>
        <div data-testid="d-preset-override" style={{ ...base, background: '#ef4444' }} ref={fadeIn({ transition: { duration: 1.5 }, animate: { opacity: 0.5, y: 0 } })}>preset + override</div>
        <div ref={host} data-testid="d-host" style={{ display: 'contents' }} />
        <Show when={owned()}>
          <OwnedWidget />
        </Show>
      </Stage>
    </>
  )
}
