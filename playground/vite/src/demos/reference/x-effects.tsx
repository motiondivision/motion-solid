import { createSignal, onSettled } from 'solid-js'
import {
  MotionValueState,
  addAttrValue,
  addEffect,
  addSVGValue,
  addStyleValue,
  animateEffectSubject,
  animateElement,
  animateValues,
  attrEffect,
  defaultTransformValue,
  findEffect,
  motionValue,
  parseValueFromTransform,
  propEffect,
  readSVGValue,
  readStyleValue,
  readTransformValue,
  removeEffect,
  styleEffect,
  styleSubjectEffect,
  svgEffect,
  svgSubjectEffect,
} from 'motion-solid'
import type { MotionValue } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-effects',
  title: 'Effects: styleEffect, svgEffect, attrEffect, propEffect and the animate pipeline',
  group: 'reference',
  description:
    'Bind motion values to DOM styles, SVG attributes, element attributes and plain object properties through the effect functions, or through the lower-level MotionValueState + addStyleValue/addSVGValue/addAttrValue. Drive them with the sliders, animateElement, animateValues and animateEffectSubject, and inspect findEffect / removeEffect / addEffect and the DOM readers (readStyleValue, readSVGValue, readTransformValue, parseValueFromTransform).',
  covers: [
    'MotionValueState',
    'addAttrValue',
    'addEffect',
    'addSVGValue',
    'addStyleValue',
    'animateEffectSubject',
    'animateElement',
    'animateValues',
    'attrEffect',
    'defaultTransformValue',
    'findEffect',
    'motionValue',
    'parseValueFromTransform',
    'propEffect',
    'readSVGValue',
    'readStyleValue',
    'readTransformValue',
    'removeEffect',
    'styleEffect',
    'styleSubjectEffect',
    'svgEffect',
    'svgSubjectEffect',
  ],
} as const

function useLive(value: MotionValue<number>) {
  const [read, write] = createSignal(value.get())
  onSettled(() => value.on('change', next => write(next)))
  return read
}

export default function Demo() {
  let box!: HTMLDivElement
  let lowBox!: HTMLDivElement
  let attrBox!: HTMLDivElement
  let circle!: SVGCircleElement
  let svgBox!: SVGRectElement
  const [attached, setAttached] = createSignal(false)
  const [tick, setTick] = createSignal(0)
  const [effectInfo, setEffectInfo] = createSignal('')
  const [animInfo, setAnimInfo] = createSignal('idle')

  const x = motionValue(0)
  const hue = motionValue(200)
  const radius = motionValue(12)
  const count = motionValue(0)
  const lowX = motionValue(0)
  const circleX = motionValue(30)
  const attrN = motionValue(1)
  const target = { count: 0 }
  const countMv = motionValue(0)
  const xNow = useLive(x)
  const radiusNow = useLive(radius)
  const [propNow, setPropNow] = createSignal(0)
  const [attrNow, setAttrNow] = createSignal('')

  onSettled(() => {
    setAttached(true)
    const stopStyle = styleEffect(box, { x, '--hue': hue })
    const stopSvg = svgEffect(circle, { r: radius })
    const stopAttr = attrEffect(attrBox, { 'data-count': count })
    const stopProp = propEffect(target, { count: countMv })
    const stopCountMv = countMv.on('change', () => setPropNow(target.count))
    // The lower-level API: a state, then one add*Value per value.
    const state = new MotionValueState()
    const stopLowStyle = addStyleValue(lowBox, state, 'x', lowX)
    const stopLowSvg = addSVGValue(circle, state, 'cx', circleX)
    const stopLowAttr = addAttrValue(attrBox, state, 'attrN', attrN, 'data-n')
    const stopAttrReadout = count.on('change', () => setAttrNow(attrBox.getAttribute('data-count') ?? ''))
    return () => {
      stopStyle(); stopSvg(); stopAttr(); stopProp(); stopCountMv()
      stopLowStyle(); stopLowSvg(); stopLowAttr(); stopAttrReadout()
    }
  })

  const slider = (label: string, min: number, max: number, value: MotionValue<number>) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} value={value.get()} onInput={event => value.set(Number(event.currentTarget.value))} />
    </label>
  )

  const inspectEffects = () => {
    const describe = (subject: unknown) => {
      const effect = findEffect(subject)
      return effect === styleSubjectEffect ? 'styleSubjectEffect' : effect === svgSubjectEffect ? 'svgSubjectEffect' : effect === propEffect ? 'propEffect' : effect ? 'custom' : 'none'
    }
    const initial = `div -> ${describe(box)}, svg -> ${describe(circle)}, object -> ${describe({})}`
    // The fallback goes in first: the most recently added matching effect wins, so the specific SVG one goes last.
    addEffect(propEffect)
    addEffect(styleSubjectEffect)
    addEffect(svgSubjectEffect)
    const registered = `div -> ${describe(box)}, svg -> ${describe(circle)}, object -> ${describe({})}`
    removeEffect(styleSubjectEffect)
    const removed = `div -> ${describe(box)}`
    // Put the registry back as it was (animate() registers its own on first use).
    removeEffect(svgSubjectEffect)
    removeEffect(propEffect)
    setEffectInfo(`initially: ${initial}; after addEffect x3: ${registered}; after removeEffect(style): ${removed}`)
  }

  const runAnimations = () => {
    const a = animateElement(box, { x: [x.get(), x.get() > 50 ? 0 : 140], opacity: [0.4, 1] }, { duration: 0.6 })
    const values: Record<string, MotionValue<number>> = {}
    const b = animateValues(key => (values[key] ??= motionValue(0)), { a: 100, b: 50 }, { duration: 0.4 })
    const c = animateEffectSubject(svgSubjectEffect, circle, { r: radius.get() > 20 ? 12 : 30 }, { duration: 0.5 })
    setAnimInfo(`animateElement: ${a.length} controls, animateValues: ${b.length} controls (${Object.keys(values).join(',')}), animateEffectSubject: ${c.length} controls`)
  }

  return (
    <>
      <Controls>
        {slider('x (styleEffect)', 0, 200, x)}
        {slider('hue (css var)', 0, 360, hue)}
        {slider('radius (svgEffect)', 4, 40, radius)}
        {slider('count (attrEffect)', 0, 99, count)}
        {slider('count (propEffect)', 0, 99, countMv)}
        {slider('low-level x', 0, 200, lowX)}
        {slider('low-level cx', 10, 90, circleX)}
        {slider('low-level data-n', 0, 9, attrN)}
        <Button onClick={runAnimations}>animateElement + animateValues + animateEffectSubject</Button>
        <Button onClick={inspectEffects}>findEffect / removeEffect / addEffect</Button>
        <Button onClick={() => setTick(n => n + 1)}>read from DOM</Button>
      </Controls>
      <Stage height="150px">
        <div ref={box} data-testid="style-box" class="box" style={{ width: '50px', height: '30px', background: 'hsl(var(--hue, 200), 70%, 50%)' }} />
        <div ref={lowBox} data-testid="low-box" class="box" style={{ width: '50px', height: '30px', 'margin-top': '10px' }} />
        <div ref={attrBox} data-testid="attr-box" style={{ 'margin-top': '10px', 'font-size': '12px' }}>
          data-count / data-n element
        </div>
        <svg viewBox="0 0 100 50" width="160" height="80" style={{ background: '#fff' }}>
          <circle ref={circle} cx="30" cy="25" r="12" fill="#2563eb" />
          <rect ref={svgBox} x="60" y="10" width="20" height="20" fill="#16a34a" />
        </svg>
      </Stage>
      <Readout label="x / radius motion values" value={`${xNow().toFixed(0)} / ${radiusNow().toFixed(0)}`} />
      <Readout label="attrEffect wrote data-count" value={attrNow() || '(move the slider)'} />
      <Readout label="propEffect wrote target.count" value={propNow()} />
      <Readout label="effects" value={effectInfo() || 'press the button'} />
      <Readout label="animate pipeline" value={animInfo()} />
      <h4>Readers</h4>
      <Readout label="readStyleValue(box, 'width')" value={attached() ? (tick(), String(readStyleValue(box, 'width'))) : 'n/a'} />
      <Readout label="readStyleValue(box, 'x')" value={attached() ? (tick(), String(readStyleValue(box, 'x'))) : 'n/a'} />
      <Readout label="readTransformValue(box, 'x')" value={attached() ? (tick(), String(readTransformValue(box, 'x'))) : 'n/a'} />
      <Readout label="readSVGValue(circle, 'r')" value={attached() ? (tick(), String(readSVGValue(circle, 'r'))) : 'n/a'} />
      <Readout label="readSVGValue(rect, 'width')" value={attached() ? String(readSVGValue(svgBox, 'width')) : 'n/a'} />
      <Readout label="parseValueFromTransform('translateX(10px) scale(2)', 'x' / 'scaleX')" value={`${parseValueFromTransform('matrix(2, 0, 0, 2, 10, 0)', 'x')} / ${parseValueFromTransform('matrix(2, 0, 0, 2, 10, 0)', 'scaleX')}`} />
      <Readout label="defaultTransformValue('scale' / 'x')" value={`${defaultTransformValue('scale')} / ${defaultTransformValue('x')}`} ok={defaultTransformValue('scale') === 1 && defaultTransformValue('x') === 0} />
    </>
  )
}
