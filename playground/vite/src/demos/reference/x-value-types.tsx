import { createMemo, createSignal, onSettled } from 'solid-js'
import {
  acceleratedValues,
  analyseComplexValue,
  applyPxDefaults,
  buildTransformer,
  camelCaseAttributes,
  camelToDash,
  containsCSSVariable,
  defaultValueTypes,
  dimensionValueTypes,
  fillWildcards,
  findDimensionValueType,
  findValueType,
  getAnimatableNone,
  getDefaultValueType,
  getValueAsType,
  getVariableValue,
  hasComplexValues,
  hslaToRgba,
  invisibleValues,
  isCSSVariableName,
  isCSSVariableToken,
  isNumericalString,
  isZeroValueString,
  numberValueTypes,
  parseCSSVariable,
  progressPercentage,
  px,
  rgbUnit,
  scale,
  testValueType,
  transformValueTypes,
} from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-value-types',
  title: 'Value types and CSS value parsing helpers',
  group: 'reference',
  description:
    'Type a CSS value and a property name: findValueType / testValueType / analyseComplexValue / buildTransformer / getAnimatableNone / getValueAsType and the CSS-variable parsers react live. Tables of numberValueTypes, transformValueTypes, defaultValueTypes, dimensionValueTypes, scale, rgbUnit, progressPercentage, hslaToRgba and the small string predicates are shown with pass cues.',
  covers: [
    'acceleratedValues',
    'analyseComplexValue',
    'applyPxDefaults',
    'buildTransformer',
    'camelCaseAttributes',
    'camelToDash',
    'containsCSSVariable',
    'defaultValueTypes',
    'dimensionValueTypes',
    'fillWildcards',
    'findDimensionValueType',
    'findValueType',
    'getAnimatableNone',
    'getDefaultValueType',
    'getValueAsType',
    'getVariableValue',
    'hasComplexValues',
    'hslaToRgba',
    'invisibleValues',
    'isCSSVariableName',
    'isCSSVariableToken',
    'isNumericalString',
    'isZeroValueString',
    'numberValueTypes',
    'parseCSSVariable',
    'progressPercentage',
    'px',
    'rgbUnit',
    'scale',
    'testValueType',
    'transformValueTypes',
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
  const [value, setValue] = createSignal('rgba(255, 0, 80, 0.5)')
  const [key, setKey] = createSignal('width')
  let host!: HTMLDivElement
  const [attached, setAttached] = createSignal(false)
  onSettled(() => { setAttached(true) })

  const info = createMemo(() => analyseComplexValue(value()))
  const [cssVar, setCssVar] = createSignal('var(--demo-color, red)')

  return (
    <>
      <Controls>
        <label>
          value <input aria-label="value" data-testid="value-input" value={value()} onInput={event => setValue(event.currentTarget.value)} />
        </label>
        <label>
          property <input aria-label="property" data-testid="key-input" value={key()} onInput={event => setKey(event.currentTarget.value)} />
        </label>
        <label>
          css var <input aria-label="css var" value={cssVar()} onInput={event => setCssVar(event.currentTarget.value)} />
        </label>
      </Controls>
      <div class="readout" style={{ 'flex-direction': 'column', 'align-items': 'flex-start' }}>
        <b>Live: your value</b>
        <Readout label="findValueType" value={safe(() => (findValueType(value()) ? 'found: ' + Object.keys(findValueType(value())).join(',') : 'none'))} />
        <Readout label="findDimensionValueType(value)" value={safe(() => (findDimensionValueType(value()) ? 'found' : 'none'))} />
        <Readout label="testValueType(value)(px)" value={String(testValueType(value())(px))} />
        <Readout label="hasComplexValues" value={String(hasComplexValues(value()))} />
        <Readout label="analyseComplexValue" value={safe(() => ({ values: info().values.length, types: info().types.length, split: info().split.length }))} />
        <Readout
          label="buildTransformer(info)(info.values)"
          value={safe(() => {
            const parsed = info()
            return buildTransformer(parsed)(parsed.values as never)
          })}
        />
        <Readout label="getAnimatableNone(property, value)" value={safe(() => getAnimatableNone(key(), value()))} />
        <Readout label="getValueAsType(parseFloat, dimension type)" value={safe(() => getValueAsType(parseFloat(value()) || 0, findDimensionValueType(key()) as never))} />
        <Readout label="getDefaultValueType(property)" value={safe(() => (getDefaultValueType(key()) ? 'has transform: ' + String(getDefaultValueType(key()).transform?.(12)) : 'none'))} />
        <Readout label="isNumericalString / isZeroValueString" value={`${isNumericalString(value())} / ${isZeroValueString(value())}`} />
        <Readout label="isCSSVariableName(property) / camelToDash" value={`${isCSSVariableName(key())} / ${camelToDash(key())}`} />
        <Readout label="camelCaseAttributes.has(property)" value={String(camelCaseAttributes.has(key()))} />
        <Readout label="invisibleValues.has(value) / acceleratedValues.has(property)" value={`${invisibleValues.has(value())} / ${acceleratedValues.has(key())}`} />
      </div>
      <div class="readout" style={{ 'flex-direction': 'column', 'align-items': 'flex-start' }}>
        <b>CSS variables</b>
        <Stage height="40px">
          <div ref={host} style={{ '--demo-color': 'rgb(1, 2, 3)', padding: '6px' }}>host element with --demo-color</div>
        </Stage>
        <Readout label="containsCSSVariable" value={String(containsCSSVariable(cssVar()))} />
        <Readout label="isCSSVariableToken" value={String(isCSSVariableToken(cssVar()))} />
        <Readout label="parseCSSVariable" value={safe(() => parseCSSVariable(cssVar()))} />
        <Readout label="getVariableValue (resolved on host)" value={safe(() => (attached() && isCSSVariableToken(cssVar()) ? getVariableValue(cssVar() as `var(--${string})`, host) : 'not a var() token'))} />
      </div>
      <div class="readout" style={{ 'flex-direction': 'column', 'align-items': 'flex-start' }}>
        <b>Fixed tables</b>
        <Readout label="numberValueTypes" value={Object.keys(numberValueTypes).length + ' keys, opacity=' + Object.keys(numberValueTypes).includes('opacity')} ok={Object.keys(numberValueTypes).includes('opacity')} />
        <Readout label="transformValueTypes" value={Object.keys(transformValueTypes).length + ' keys, rotate.transform(30)=' + String(transformValueTypes.rotate?.transform?.(30))} ok={transformValueTypes.rotate?.transform?.(30) === '30deg'} />
        <Readout label="defaultValueTypes" value={Object.keys(defaultValueTypes).length + ' keys, has color=' + ('color' in defaultValueTypes)} ok={'color' in defaultValueTypes} />
        <Readout label="dimensionValueTypes" value={dimensionValueTypes.length + ' types (number, px, percent, vw, vh, auto)'} ok={dimensionValueTypes.length >= 5} />
        <Readout label="scale.transform(0.5)" value={String(scale.transform(0.5))} ok={scale.transform(0.5) === 0.5} />
        <Readout label="rgbUnit.transform(300)" value={String(rgbUnit.transform(300))} ok={rgbUnit.transform(300) === 255} />
        <Readout label="progressPercentage.transform(0.25)" value={String(progressPercentage.transform(0.25))} ok={progressPercentage.transform(0.25) === '25%'} />
        <Readout label="hslaToRgba(h0 s100 l50)" value={safe(() => hslaToRgba({ hue: 0, saturation: 100, lightness: 50, alpha: 1 }))} ok={hslaToRgba({ hue: 0, saturation: 100, lightness: 50, alpha: 1 }).red === 255} />
        <Readout
          label="fillWildcards([null, 10, null])"
          value={safe(() => {
            const frames: Array<number | null> = [null, 10, null]
            fillWildcards(frames as never)
            return frames
          })}
        />
        <Readout
          label="applyPxDefaults(['0', 10], 'width')"
          value={safe(() => {
            const frames = ['0', 10, '50%'] as Array<string | number>
            applyPxDefaults(frames as never, 'width')
            return frames
          })}
        />
      </div>
    </>
  )
}
