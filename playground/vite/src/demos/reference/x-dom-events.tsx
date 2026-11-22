import { createSignal, onSettled } from 'solid-js'
import {
  PanSession,
  VisualElementDragControls,
  addDomEvent,
  elementDragControls,
  visualElementStore,
  addPinchListeners,
  addPointerEvent,
  addPointerInfo,
  drag,
  extractEventInfo,
  getComputedStyle as readComputedStyle,
  hover,
  isElementKeyboardAccessible,
  isElementTextInput,
  isHTMLElement,
  isNodeOrChild,
  isPrimaryPointer,
  isSVGElement,
  isSVGSVGElement,
  isSVGTag,
  pinch,
  press,
  resize,
  resolveElements,
  scroll,
  scrollInfo,
  setStyle,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-dom-events',
  title: 'DOM event, gesture and observer helpers',
  group: 'reference',
  description:
    'Plain-DOM helpers without components: addDomEvent / addPointerEvent / addPointerInfo / extractEventInfo / isPrimaryPointer on a pointer pad, hover() and press() on a box, drag() on a free element, pinch() and addPinchListeners (ctrl+wheel or touch), resize() on a resizable box, scroll() and scrollInfo() on a scroll area, resolveElements, getComputedStyle and setStyle, and an inspector for the element predicates (click any sample).',
  covers: [
    'PanSession',
    'VisualElementDragControls',
    'addDomEvent',
    'addPinchListeners',
    'addPointerEvent',
    'addPointerInfo',
    'drag',
    'elementDragControls',
    'extractEventInfo',
    'getComputedStyle',
    'hover',
    'isElementKeyboardAccessible',
    'isElementTextInput',
    'isHTMLElement',
    'isNodeOrChild',
    'isPrimaryPointer',
    'isSVGElement',
    'isSVGSVGElement',
    'isSVGTag',
    'pinch',
    'press',
    'resize',
    'resolveElements',
    'scroll',
    'scrollInfo',
    'setStyle',
    'visualElementStore',
  ],
} as const

export default function Demo() {
  let pad!: HTMLDivElement
  let hoverBox!: HTMLDivElement
  let freeBox!: HTMLDivElement
  let dragArea!: HTMLDivElement
  let pinchBox!: HTMLDivElement
  let sizeBox!: HTMLDivElement
  let scrollArea!: HTMLDivElement
  let inspector!: HTMLDivElement
  let styled!: HTMLDivElement

  const [padInfo, setPadInfo] = createSignal('move over the pad')
  const [wrapped, setWrapped] = createSignal('0')
  const [hoverInfo, setHoverInfo] = createSignal('0 enters / 0 leaves')
  const [pressInfo, setPressInfo] = createSignal('0 presses / 0 releases')
  const [panInfo, setPanInfo] = createSignal('press and drag on the pad')
  const [registry, setRegistry] = createSignal('')
  const [dragInfo, setDragInfo] = createSignal('drag the free box')
  const [pinchInfo, setPinchInfo] = createSignal('ctrl + wheel over the box (or two touches)')
  const [sizeInfo, setSizeInfo] = createSignal('')
  const [width, setWidth] = createSignal(120)
  const [scrollText, setScrollText] = createSignal('scroll the area')
  const [infoText, setInfoText] = createSignal('')
  const [inspected, setInspected] = createSignal('click a sample')
  const [matches, setMatches] = createSignal('')
  const [opacity, setOpacity] = createSignal(1)
  const [computed, setComputed] = createSignal('')

  onSettled(() => {
    const cleanups: VoidFunction[] = []
    let moves = 0
    cleanups.push(addPointerEvent(pad, 'pointermove', (event, info) => {
      moves++
      setPadInfo(`pointermove #${moves} point=(${Math.round(info.point.x)}, ${Math.round(info.point.y)}) primary=${isPrimaryPointer(event as PointerEvent)} extract=${JSON.stringify(extractEventInfo(event as PointerEvent).point)}`.replace(/"/g, ''))
    }))
    let wraps = 0
    cleanups.push(addDomEvent(pad, 'pointerdown', addPointerInfo((_event, info) => setWrapped(`${++wraps} (x=${Math.round(info.point.x)})`)) as EventListener))

    cleanups.push(addPointerEvent(pad, 'pointerdown', event => {
      const session = new PanSession(event as PointerEvent, {
        onStart: (_event, info) => setPanInfo(`PanSession started at (${Math.round(info.point.x)}, ${Math.round(info.point.y)})`),
        onMove: (_event, info) => setPanInfo(`PanSession move offset=(${Math.round(info.offset.x)}, ${Math.round(info.offset.y)}) velocity=(${Math.round(info.velocity.x)}, ${Math.round(info.velocity.y)})`),
        onEnd: (_event, info) => setPanInfo(`PanSession ended with offset=(${Math.round(info.offset.x)}, ${Math.round(info.offset.y)})`),
      } as never, { contextWindow: window } as never)
      void session
    }))

    let enters = 0
    let leaves = 0
    cleanups.push(hover(hoverBox, () => {
      enters++
      setHoverInfo(`${enters} enters / ${leaves} leaves`)
      return () => {
        leaves++
        setHoverInfo(`${enters} enters / ${leaves} leaves`)
      }
    }))
    let presses = 0
    let releases = 0
    cleanups.push(press(hoverBox, () => {
      presses++
      setPressInfo(`${presses} presses / ${releases} releases`)
      return (_end, info) => {
        releases++
        setPressInfo(`${presses} presses / ${releases} releases (last success=${String(info.success)})`)
      }
    }))

    cleanups.push(drag(freeBox, { constraints: dragArea, elastic: 0.1 }))
    const dragVisualElement = visualElementStore.get(freeBox)
    setRegistry(`visualElementStore has the box: ${!!dragVisualElement}; elementDragControls entry is a VisualElementDragControls: ${dragVisualElement ? elementDragControls.get(dragVisualElement) instanceof VisualElementDragControls : false}`)
    const dragObserver = addPointerEvent(freeBox, 'pointerup', (_event, info) => setDragInfo(`released at (${Math.round(info.point.x)}, ${Math.round(info.point.y)})`))
    cleanups.push(dragObserver)

    cleanups.push(pinch(pinchBox, element => {
      setPinchInfo('pinch started on ' + element.tagName.toLowerCase())
      return { onPinch: (_event, info) => setPinchInfo(`scale=${info.scale?.toFixed(2)} rotate=${info.rotate?.toFixed(1)}`), onPinchEnd: () => setPinchInfo('pinch ended') }
    }, { rotate: false }))
    cleanups.push(addPinchListeners(
      pinchBox,
      () => ({ scale: undefined, rotate: undefined, x: undefined, y: undefined }) as never,
      () => ({ scale: true, rotate: false }),
      () => {},
    ))

    cleanups.push(resize(sizeBox, (_element, info) => setSizeInfo(`${Math.round(info.width)} x ${Math.round(info.height)}`)))
    cleanups.push(resize(() => {}))

    cleanups.push(scroll(progress => setScrollText(`scroll() progress=${(progress as number).toFixed(2)}`), { container: scrollArea }))
    cleanups.push(scrollInfo(info => setInfoText(`scrollInfo y: offset=${Math.round(info.y.current)} progress=${info.y.progress.toFixed(2)}`), { container: scrollArea }))

    const elements = resolveElements('.resolve-me', { current: inspector, animations: [] } as never)
    setMatches(`resolveElements('.resolve-me', scope) = ${elements.length} elements`)
    setComputed(readComputedStyle(styled, 'opacity'))
    return () => cleanups.forEach(stop => stop())
  })

  const inspect = (event: MouseEvent) => {
    const target = event.target as Element
    setInspected(
      `<${target.tagName.toLowerCase()}>: isHTMLElement=${isHTMLElement(target)} isSVGElement=${isSVGElement(target)} isSVGSVGElement=${isSVGSVGElement(target)} isSVGTag=${isSVGTag(target.tagName.toLowerCase())} keyboardAccessible=${isElementKeyboardAccessible(target)} textInput=${isElementTextInput(target)} insideInspector=${isNodeOrChild(inspector, target)} outside=${isNodeOrChild(pad, target)}`,
    )
  }

  const changeOpacity = (value: number) => {
    setOpacity(value)
    setStyle(styled, 'opacity', value)
    setComputed(readComputedStyle(styled, 'opacity'))
  }

  return (
    <>
      <h4>Pointer events</h4>
      <div ref={pad} data-testid="pad" class="box" style={{ width: '100%', height: '60px', 'touch-action': 'none' }}>pointer pad</div>
      <Readout label="addPointerEvent" value={padInfo()} />
      <Readout label="PanSession" value={panInfo()} />
      <Readout label="addDomEvent + addPointerInfo (pointerdown count)" value={wrapped()} />

      <h4>hover() / press()</h4>
      <div ref={hoverBox} data-testid="hover-box" class="box" style={{ width: '120px', height: '40px' }}>hover / press me</div>
      <Readout label="hover" value={hoverInfo()} />
      <Readout label="press" value={pressInfo()} />

      <h4>drag() on a plain element</h4>
      <div ref={dragArea} style={{ width: '320px', height: '100px', border: '1px dashed var(--border)', position: 'relative' }}>
        <div ref={freeBox} data-testid="free-box" class="box" style={{ width: '50px', height: '50px', 'touch-action': 'none' }} />
      </div>
      <Readout label="drag(el, { constraints })" value={dragInfo()} />
      <Readout label="registries" value={registry()} />

      <h4>pinch() / addPinchListeners</h4>
      <div ref={pinchBox} data-testid="pinch-box" class="box" style={{ width: '120px', height: '60px' }}>pinch me</div>
      <Readout label="pinch" value={pinchInfo()} />

      <h4>resize()</h4>
      <Controls>
        <input type="range" aria-label="box width" min="60" max="300" value={width()} onInput={event => setWidth(Number(event.currentTarget.value))} />
      </Controls>
      <div ref={sizeBox} data-testid="size-box" class="box" style={{ width: `${width()}px`, height: '40px' }} />
      <Readout label="resize(el)" value={sizeInfo()} />

      <h4>scroll() / scrollInfo()</h4>
      <div ref={scrollArea} data-testid="scroll-area" style={{ height: '90px', 'overflow-y': 'scroll', border: '1px solid var(--border)' }}>
        <div style={{ height: '400px', background: 'linear-gradient(#e2e8f0, #94a3b8)' }}>tall content</div>
      </div>
      <Readout label="scroll" value={scrollText()} />
      <Readout label="scrollInfo" value={infoText()} />

      <h4>Element predicates</h4>
      <div ref={inspector} onClick={inspect} style={{ display: 'flex', gap: '12px', 'align-items': 'center' }}>
        <div class="resolve-me box" style={{ padding: '4px' }}>div</div>
        <button type="button" class="btn resolve-me">button</button>
        <input aria-label="sample input" value="input" />
        <textarea aria-label="sample textarea" rows="1">textarea</textarea>
        <svg width="60" height="30" viewBox="0 0 60 30">
          <circle cx="15" cy="15" r="10" fill="#2563eb" />
        </svg>
      </div>
      <Readout label="clicked element" value={inspected()} />
      <Readout label="resolveElements" value={matches()} />

      <h4>setStyle / getComputedStyle</h4>
      <Controls>
        <input type="range" aria-label="opacity" min="0" max="1" step="0.1" value={opacity()} onInput={event => changeOpacity(Number(event.currentTarget.value))} />
        <Button onClick={() => changeOpacity(1)}>reset</Button>
      </Controls>
      <Stage height="40px">
        <div ref={styled} class="box" style={{ width: '40px', height: '20px' }} />
      </Stage>
      <Readout label="getComputedStyle(el, 'opacity')" value={computed()} />
    </>
  )
}
