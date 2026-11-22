import { createMemo, createSignal, onSettled } from 'solid-js'
import {
  buildHTMLStyles,
  buildSVGAttrs,
  buildSVGPath,
  buildTransform,
  compareByDepth,
  getMotionSSRStyle,
  has2DTranslate,
  hasScale,
  hasTransform,
  isForcedMotionValue,
  isMotionValue,
  motionValue,
  originProps,
  positionalKeys,
  renderHTML,
  renderSVG,
  scrapeHTMLMotionValuesFromProps,
  scrapeSVGMotionValuesFromProps,
  transformPropOrder,
  transformProps,
  updateMotionValuesFromProps,
} from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-render-utils',
  title: 'Render helpers: buildHTMLStyles, buildSVGAttrs, renderHTML, scrape and transform key sets',
  group: 'reference',
  description:
    'Move the sliders: the latest values are turned into a style/transform string by buildHTMLStyles and buildTransform, written to the box with renderHTML; the SVG path gets pathLength attributes from buildSVGAttrs/buildSVGPath and renderSVG. Also shows the transform key sets, scraping motion values out of props, updateMotionValuesFromProps with a stub element, isForcedMotionValue and getMotionSSRStyle.',
  covers: [
    'buildHTMLStyles',
    'buildSVGAttrs',
    'buildSVGPath',
    'buildTransform',
    'compareByDepth',
    'getMotionSSRStyle',
    'has2DTranslate',
    'hasScale',
    'hasTransform',
    'isForcedMotionValue',
    'isMotionValue',
    'motionValue',
    'originProps',
    'positionalKeys',
    'renderHTML',
    'renderSVG',
    'scrapeHTMLMotionValuesFromProps',
    'scrapeSVGMotionValuesFromProps',
    'transformPropOrder',
    'transformProps',
    'updateMotionValuesFromProps',
  ],
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
  const [x, setX] = createSignal(40)
  const [scale, setScale] = createSignal(1)
  const [rotate, setRotate] = createSignal(10)
  const [pathLength, setPathLength] = createSignal(0.6)
  let box!: HTMLDivElement
  let path!: SVGPathElement
  const [attached, setAttached] = createSignal(false)
  onSettled(() => { setAttached(true) })

  const latest = createMemo(() => ({ x: x(), scale: scale(), rotate: rotate(), opacity: 0.9, '--tone': 'red', originX: 0.25 }))
  const htmlState = createMemo(() => {
    const state = { style: {} as Record<string, string>, vars: {} as Record<string, string>, transform: {} as Record<string, string>, transformOrigin: {} as Record<string, string> }
    buildHTMLStyles(state as never, latest() as never)
    return state
  })
  const svgState = createMemo(() => {
    const state = { style: {}, vars: {}, transform: {}, transformOrigin: {}, attrs: {} as Record<string, unknown> }
    buildSVGAttrs(state as never, { pathLength: pathLength(), pathSpacing: 1, attrX: 5 } as never, false)
    return state
  })

  // Apply to the real elements once mounted; re-run when the values change.
  const applied = createMemo(() => {
    if (!attached()) return 'n/a'
    renderHTML(box, htmlState() as never)
    renderSVG(path, svgState() as never)
    return box.getAttribute('style') ?? ''
  })

  const mv = motionValue(5)
  const props = { style: { x: mv, color: 'red', opacity: 1 }, cx: mv }
  const stub = (() => {
    const values = new Map<string, unknown>()
    return {
      values,
      addValue: (key: string, value: unknown) => values.set(key, value),
      removeValue: (key: string) => values.delete(key),
      hasValue: (key: string) => values.has(key),
      getValue: (key: string) => values.get(key),
      getStaticValue: () => undefined,
    }
  })()

  const slider = (label: string, min: number, max: number, step: number, value: number, set: (n: number) => void) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={event => set(Number(event.currentTarget.value))} />
    </label>
  )

  return (
    <>
      <Controls>
        {slider('x', -100, 200, 5, x(), setX)}
        {slider('scale', 0.5, 2, 0.1, scale(), setScale)}
        {slider('rotate', -90, 90, 5, rotate(), setRotate)}
        {slider('pathLength', 0.1, 1, 0.1, pathLength(), setPathLength)}
      </Controls>
      <Stage height="120px">
        <div ref={box} data-testid="render-box" class="box" style={{ width: '50px', height: '50px' }} />
        <svg viewBox="0 0 100 30" width="200" height="60" style={{ background: '#fff' }}>
          <path ref={path} d="M5 25 C 30 0, 60 40, 95 5" fill="none" stroke="#2563eb" stroke-width="3" />
        </svg>
      </Stage>
      <Readout label="buildHTMLStyles -> style" value={JSON.stringify(htmlState().style)} />
      <Readout label="buildHTMLStyles -> vars" value={JSON.stringify(htmlState().vars)} />
      <Readout label="buildTransform(latest, {})" value={safe(() => buildTransform(latest() as never, {} as never))} />
      <Readout label="renderHTML wrote style" value={applied()} />
      <Readout label="buildSVGAttrs -> attrs" value={JSON.stringify(svgState().attrs)} />
      <Readout label="buildSVGPath(attrs, 1, 2, 0.5)" value={safe(() => { const attrs: Record<string, unknown> = {}; buildSVGPath(attrs as never, 1, 2, 0.5); return attrs })} />
      <Readout label="renderSVG wrote path attrs" value={attached() ? (applied(), `${path.getAttribute('stroke-dasharray')} / pathLength=${path.getAttribute('pathLength')}`) : 'n/a'} />
      <h4>Key sets and predicates</h4>
      <Readout label="transformPropOrder" value={transformPropOrder.join(' ')} />
      <Readout label="transformProps.has('x' | 'width')" value={`${transformProps.has('x')} / ${transformProps.has('width')}`} ok={transformProps.has('x') && !transformProps.has('width')} />
      <Readout label="originProps / positionalKeys" value={`${[...originProps].join(',')} / ${[...positionalKeys].slice(0, 6).join(',')}...`} />
      <Readout label="hasTransform / has2DTranslate / hasScale" value={`${hasTransform(latest() as never)} / ${String(has2DTranslate(latest() as never))} / ${hasScale(latest() as never)}`} />
      <Readout label="isForcedMotionValue('scaleX' | 'width', layout)" value={`${isForcedMotionValue('scaleX', {})} / ${isForcedMotionValue('width', { layout: true })}`} />
      <Readout label="compareByDepth({depth:1}, {depth:3})" value={safe(() => compareByDepth({ depth: 1 } as never, { depth: 3 } as never))} ok={compareByDepth({ depth: 1 } as never, { depth: 3 } as never) < 0} />
      <h4>Scraping and syncing values</h4>
      <Readout label="isMotionValue(mv) / isMotionValue(5)" value={`${isMotionValue(mv)} / ${isMotionValue(5)}`} ok={isMotionValue(mv) && !isMotionValue(5)} />
      <Readout label="scrapeHTMLMotionValuesFromProps keys" value={safe(() => Object.keys(scrapeHTMLMotionValuesFromProps(props as never, {} as never)))} />
      <Readout label="scrapeSVGMotionValuesFromProps keys" value={safe(() => Object.keys(scrapeSVGMotionValuesFromProps(props as never, {} as never)))} />
      <Readout
        label="updateMotionValuesFromProps(stub, next, prev)"
        value={safe(() => {
          updateMotionValuesFromProps(stub, { x: mv, opacity: 1 } as never, { y: 2 } as never)
          return { keys: [...stub.values.keys()] }
        })}
      />
      <Readout label="getMotionSSRStyle({initial:{x:10,opacity:0.5}})" value={safe(() => getMotionSSRStyle({ initial: { x: 10, opacity: 0.5 } } as never))} />
    </>
  )
}
