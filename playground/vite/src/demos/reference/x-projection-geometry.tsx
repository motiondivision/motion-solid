import { createMemo, createSignal, onSettled } from 'solid-js'
import {
  addScaleCorrector,
  applyAxisDelta,
  applyBoxDelta,
  applyPointDelta,
  applyTreeDeltas,
  aspectRatio,
  axisDeltaEquals,
  axisEquals,
  axisEqualsRounded,
  boxEquals,
  boxEqualsRounded,
  buildProjectionTransform,
  calcAxisDelta,
  calcBoxDelta,
  calcLength,
  calcRelativeAxis,
  calcRelativeAxisPosition,
  calcRelativeBox,
  calcRelativePosition,
  convertBoundingBoxToBox,
  convertBoxToBoundingBox,
  copyAxisDeltaInto,
  copyAxisInto,
  copyBoxInto,
  correctBorderRadius,
  correctBoxShadow,
  correctParentTransform,
  createAxis,
  createAxisDelta,
  createBox,
  createDelta,
  eachAxis,
  isDeltaZero,
  measurePageBox,
  measureViewportBox,
  pixelsToPercent,
  removeAxisDelta,
  removeAxisTransforms,
  removeBoxTransforms,
  removePointDelta,
  rootProjectionNode,
  scaleCorrectors,
  scalePoint,
  transformAxis,
  transformBox,
  transformBoxPoints,
  transformViewBoxPoint,
  translateAxis,
} from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-projection-geometry',
  title: 'Projection geometry: boxes, axes, deltas and scale correctors',
  group: 'reference',
  description:
    'Resize the blue target box with the sliders. The deltas that project the grey source box onto it are computed live (calcBoxDelta), applied back (applyBoxDelta, applyAxisDelta, applyPointDelta, scalePoint), removed again (removePointDelta, removeAxisDelta, removeBoxTransforms), compared (boxEquals family), transformed (transformBox, transformAxis, translateAxis) and turned into a CSS transform (buildProjectionTransform). Scale correctors, DOM measuring and SVG/parent point transforms are shown below.',
  covers: [
    'addScaleCorrector',
    'applyAxisDelta',
    'applyBoxDelta',
    'applyPointDelta',
    'applyTreeDeltas',
    'aspectRatio',
    'axisDeltaEquals',
    'axisEquals',
    'axisEqualsRounded',
    'boxEquals',
    'boxEqualsRounded',
    'buildProjectionTransform',
    'calcAxisDelta',
    'calcBoxDelta',
    'calcLength',
    'calcRelativeAxis',
    'calcRelativeAxisPosition',
    'calcRelativeBox',
    'calcRelativePosition',
    'convertBoundingBoxToBox',
    'convertBoxToBoundingBox',
    'copyAxisDeltaInto',
    'copyAxisInto',
    'copyBoxInto',
    'correctBorderRadius',
    'correctBoxShadow',
    'correctParentTransform',
    'createAxis',
    'createAxisDelta',
    'createBox',
    'createDelta',
    'eachAxis',
    'isDeltaZero',
    'measurePageBox',
    'measureViewportBox',
    'pixelsToPercent',
    'removeAxisDelta',
    'removeAxisTransforms',
    'removeBoxTransforms',
    'removePointDelta',
    'rootProjectionNode',
    'scaleCorrectors',
    'scalePoint',
    'transformAxis',
    'transformBox',
    'transformBoxPoints',
    'transformViewBoxPoint',
    'translateAxis',
  ],
} as const

const safe = (fn: () => unknown): string => {
  try {
    const out = fn()
    return typeof out === 'string' ? out : JSON.stringify(out, (_k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)) ?? String(out)
  } catch (error) {
    return 'ERR ' + (error as Error).message
  }
}
const box = (x0: number, x1: number, y0: number, y1: number) => {
  const b = createBox()
  b.x.min = x0
  b.x.max = x1
  b.y.min = y0
  b.y.max = y1
  return b
}
const fmt = (b: ReturnType<typeof createBox>) => `x ${b.x.min.toFixed(1)}..${b.x.max.toFixed(1)}  y ${b.y.min.toFixed(1)}..${b.y.max.toFixed(1)}`

export default function Demo() {
  const [left, setLeft] = createSignal(160)
  const [top, setTop] = createSignal(30)
  const [width, setWidth] = createSignal(160)
  const [height, setHeight] = createSignal(90)
  const [attached, setAttached] = createSignal(false)
  const [scroll, setScroll] = createSignal(0)
  let measured!: HTMLDivElement
  let svg!: SVGSVGElement
  let parentEl!: HTMLDivElement
  onSettled(() => { setAttached(true) })

  const source = box(20, 120, 20, 80)
  const target = createMemo(() => box(left(), left() + width(), top(), top() + height()))
  const delta = createMemo(() => {
    const d = createDelta()
    calcBoxDelta(d, source, target())
    return d
  })
  const applied = createMemo(() => {
    const b = createBox()
    copyBoxInto(b, source)
    applyBoxDelta(b, delta())
    return b
  })

  const slider = (label: string, min: number, max: number, value: number, set: (n: number) => void) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} value={value} onInput={event => set(Number(event.currentTarget.value))} />
    </label>
  )

  // Scale corrector registered once: show it appears in the registry.
  addScaleCorrector({ '--playground-radius': { correct: (latest: string | number) => `calc(${String(latest)} * 2)` } as never })

  return (
    <>
      <Controls>
        {slider('target left', 0, 300, left(), setLeft)}
        {slider('target top', 0, 120, top(), setTop)}
        {slider('target width', 20, 240, width(), setWidth)}
        {slider('target height', 20, 150, height(), setHeight)}
      </Controls>
      <svg viewBox="0 0 420 160" width="420" height="160" style={{ background: '#fff', border: '1px solid var(--border)' }}>
        <rect x={source.x.min} y={source.y.min} width={calcLength(source.x)} height={calcLength(source.y)} fill="#cbd5e1" />
        <rect x={target().x.min} y={target().y.min} width={calcLength(target().x)} height={calcLength(target().y)} fill="none" stroke="#2563eb" stroke-width="2" />
        <rect data-testid="applied" x={applied().x.min} y={applied().y.min} width={calcLength(applied().x)} height={calcLength(applied().y)} fill="none" stroke="#16a34a" stroke-dasharray="4" />
      </svg>

      <h4>Delta calculation and application</h4>
      <Readout label="createBox / createAxis / createDelta / createAxisDelta" value={safe(() => [createBox(), createAxis(), createAxisDelta(), createDelta()].length + ' fresh objects')} />
      <Readout label="calcBoxDelta x" value={safe(() => delta().x)} />
      <Readout label="calcBoxDelta y" value={safe(() => delta().y)} />
      <Readout label="applyBoxDelta(source, delta) == target" value={`${fmt(applied())} -> ${boxEqualsRounded(applied(), target())}`} ok={boxEqualsRounded(applied(), target())} />
      <Readout label="boxEquals(applied, target) / axisEquals / axisEqualsRounded" value={`${boxEquals(applied(), target())} / ${axisEquals(applied().x, target().x)} / ${axisEqualsRounded(applied().x, target().x)}`} />
      <Readout
        label="calcAxisDelta + applyAxisDelta + axisDeltaEquals"
        value={safe(() => {
          const d = createAxisDelta()
          calcAxisDelta(d, source.x, target().x)
          const copy = createAxisDelta()
          copyAxisDeltaInto(copy, d)
          const axis = createAxis()
          copyAxisInto(axis, source.x)
          applyAxisDelta(axis, d.translate, d.scale, d.originPoint)
          return { axis, same: axisDeltaEquals(copy, d) }
        })}
      />
      <Readout label="isDeltaZero(delta) / isDeltaZero(identity)" value={`${isDeltaZero(delta())} / ${isDeltaZero(createDelta())}`} ok={isDeltaZero(createDelta())} />
      <Readout label="calcLength / aspectRatio (target)" value={`${calcLength(target().x)} / ${aspectRatio(target()).toFixed(3)}`} />
      <Readout label="eachAxis" value={safe(() => eachAxis(axis => axis))} ok={eachAxis(axis => axis).join() === 'x,y'} />
      <Readout label="buildProjectionTransform(delta, treeScale)" value={buildProjectionTransform(delta(), { x: 1, y: 1 })} />
      <Readout label="pixelsToPercent(10, target.x)" value={pixelsToPercent(10, target().x).toFixed(3) + '%'} />

      <h4>Points, removal, transforms</h4>
      <Readout label="scalePoint(10, 2, 0)" value={scalePoint(10, 2, 0)} ok={scalePoint(10, 2, 0) === 20} />
      <Readout label="applyPointDelta(10, 5, 2, 0)" value={applyPointDelta(10, 5, 2, 0)} ok={applyPointDelta(10, 5, 2, 0) === 25} />
      <Readout label="removePointDelta(25, 5, 2, 0)" value={removePointDelta(25, 5, 2, 0)} ok={removePointDelta(25, 5, 2, 0) === 10} />
      <Readout
        label="removeAxisDelta (undo a translate)"
        value={safe(() => {
          const axis = createAxis()
          axis.min = 50
          axis.max = 150
          removeAxisDelta(axis, 20, 1, 0.5)
          return axis
        })}
      />
      <Readout
        label="transformBox then removeBoxTransforms"
        value={safe(() => {
          const b = box(0, 100, 0, 100)
          const original = box(0, 100, 0, 100)
          const transform = { x: 30, y: 10, scaleX: 2, scaleY: 1, originX: 0.5, originY: 0.5 }
          transformBox(b, transform)
          const moved = fmt(b)
          removeBoxTransforms(b, transform, original, original)
          return `${moved} then ${fmt(b)}`
        })}
      />
      <Readout
        label="transformAxis / translateAxis / removeAxisTransforms"
        value={safe(() => {
          const axis = createAxis()
          axis.min = 0
          axis.max = 100
          transformAxis(axis, 10, 1)
          translateAxis(axis, 5)
          const moved = { ...axis }
          removeAxisTransforms(axis, { x: 10, scaleX: 1, originX: 0.5 }, ['x', 'scaleX', 'originX'])
          return { moved, restored: axis }
        })}
      />
      <Readout
        label="applyTreeDeltas(box, treeScale, [parent delta])"
        value={safe(() => {
          const b = box(0, 100, 0, 100)
          const parentDelta = createDelta()
          parentDelta.x.scale = 2
          parentDelta.x.translate = 10
          const scale = { x: 1, y: 1 }
          applyTreeDeltas(b, scale, [{ projectionDelta: parentDelta, options: {}, latestValues: {} } as never])
          return { box: fmt(b), treeScale: scale }
        })}
      />

      <h4>Relative geometry and conversions</h4>
      <Readout
        label="calcRelativeAxis / calcRelativeAxisPosition"
        value={safe(() => {
          const t = createAxis()
          const r = createAxis()
          r.min = 10
          r.max = 60
          const p = createAxis()
          p.min = 100
          p.max = 300
          calcRelativeAxis(t, r, p)
          const l = createAxis()
          l.min = 150
          l.max = 200
          const t2 = createAxis()
          calcRelativeAxisPosition(t2, l, p)
          return { calcRelativeAxis: t, calcRelativeAxisPosition: t2 }
        })}
      />
      <Readout
        label="calcRelativeBox / calcRelativePosition"
        value={safe(() => {
          const t = createBox()
          calcRelativeBox(t, box(0, 10, 0, 10), box(100, 200, 100, 200))
          const t2 = createBox()
          calcRelativePosition(t2, box(150, 160, 150, 160), box(100, 200, 100, 200))
          return { calcRelativeBox: fmt(t), calcRelativePosition: fmt(t2) }
        })}
      />
      <Readout label="convertBoxToBoundingBox / back" value={safe(() => { const bb = convertBoxToBoundingBox(target()); return { bb, back: fmt(convertBoundingBoxToBox(bb)) } })} />
      <Readout label="transformBoxPoints(bb, point => doubled)" value={safe(() => transformBoxPoints({ top: 1, left: 2, right: 3, bottom: 4 }, point => ({ x: point.x * 2, y: point.y * 2 })))} />

      <h4>DOM measuring, SVG and parent points</h4>
      <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
        <div ref={measured} data-testid="measured" class="box" style={{ width: '80px', height: '30px', 'margin-left': `${scroll()}px` }} />
        <input type="range" aria-label="measured offset" min="0" max="100" value={scroll()} onInput={event => setScroll(Number(event.currentTarget.value))} />
      </div>
      <Readout label="measureViewportBox(el)" value={attached() ? (scroll(), fmt(measureViewportBox(measured))) : 'n/a'} />
      <Readout label="measurePageBox(el, rootProjectionNode.current)" value={attached() ? (scroll(), fmt(measurePageBox(measured, rootProjectionNode.current ?? {}))) : 'n/a'} />
      <svg ref={svg} viewBox="0 0 100 50" width="200" height="100" style={{ background: '#fff', border: '1px solid var(--border)' }}>
        <circle cx="50" cy="25" r="10" fill="#2563eb" />
      </svg>
      <Readout label="transformViewBoxPoint(svg)({x:100,y:100})" value={attached() ? safe(() => transformViewBoxPoint(svg)({ x: 100, y: 100 })) : 'n/a'} />
      <div ref={parentEl} style={{ height: '1px' }} />
      <Readout label="correctParentTransform(parent)({x:10,y:10})" value={attached() ? safe(() => correctParentTransform(parentEl)({ x: 10, y: 10 })) : 'n/a'} />

      <h4>Scale correctors</h4>
      <Readout label="scaleCorrectors keys" value={Object.keys(scaleCorrectors).join(', ')} ok={'borderRadius' in scaleCorrectors && '--playground-radius' in scaleCorrectors} />
      <Readout label="correctBorderRadius.correct(10, {target})" value={safe(() => correctBorderRadius.correct(10, { target: target() } as never))} />
      <Readout
        label="correctBoxShadow.correct('5px 5px 10px #000')"
        value={safe(() => correctBoxShadow.correct('5px 5px 10px #000', { treeScale: { x: 1, y: 1 }, projectionDelta: delta() } as never))}
      />
      <Readout label="custom corrector('--playground-radius')" value={safe(() => (scaleCorrectors['--playground-radius'] as unknown as { correct: (v: string) => string }).correct('4px'))} />
    </>
  )
}
