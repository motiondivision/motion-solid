import { createSignal } from 'solid-js'
import {
  applyGeneratorOptions,
  convertOffsetToTimes,
  createGeneratorEasing,
  defaultEasing,
  defaultOffset,
  easingDefinitionToFunction,
  fillOffset,
  getDefaultTransition,
  getEasingForSegment,
  getFinalKeyframe,
  getOriginIndex,
  getSpringOptions,
  getValueTransition,
  inertia,
  isBezierDefinition,
  isEasingArray,
  isGenerator,
  isTransitionDefined,
  isWaapiSupportedEasing,
  keyframes,
  makeAnimationInstant,
  mapEasingToNativeEasing,
  maxGeneratorDuration,
  resolveTransition,
  spring,
  supportedWaapiEasing,
} from 'motion-solid'
import { Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-generators',
  title: 'Animation generators and transition helpers',
  group: 'reference',
  description:
    'Sample the keyframes() and inertia() generators at a time you choose, inspect getSpringOptions/applyGeneratorOptions for spring sliders, and see how offsets, easing definitions, WAAPI easing mapping, final keyframes and transition resolution helpers answer for given inputs.',
  covers: [
    'applyGeneratorOptions',
    'convertOffsetToTimes',
    'createGeneratorEasing',
    'defaultEasing',
    'defaultOffset',
    'easingDefinitionToFunction',
    'fillOffset',
    'getDefaultTransition',
    'getEasingForSegment',
    'getFinalKeyframe',
    'getOriginIndex',
    'getSpringOptions',
    'getValueTransition',
    'inertia',
    'isBezierDefinition',
    'isEasingArray',
    'isGenerator',
    'isTransitionDefined',
    'isWaapiSupportedEasing',
    'keyframes',
    'makeAnimationInstant',
    'mapEasingToNativeEasing',
    'maxGeneratorDuration',
    'resolveTransition',
    'supportedWaapiEasing',
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

export default function Demo() {
  const [time, setTime] = createSignal(300)
  const [velocity, setVelocity] = createSignal(500)
  const [stiffness, setStiffness] = createSignal(100)
  const [bounce, setBounce] = createSignal(0.25)
  const slider = (label: string, min: number, max: number, step: number, value: number, set: (n: number) => void) => (
    <label>
      {label} <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onInput={event => set(Number(event.currentTarget.value))} />
    </label>
  )
  return (
    <>
      <Controls>
        {slider('time (ms)', 0, 1000, 10, time(), setTime)}
        {slider('velocity', -2000, 2000, 50, velocity(), setVelocity)}
        {slider('stiffness', 20, 400, 10, stiffness(), setStiffness)}
        {slider('bounce', 0, 0.9, 0.05, bounce(), setBounce)}
      </Controls>
      <h4>Generators</h4>
      <Readout label="keyframes([0,100,50], 1000ms, easeInOut).next(t)" value={safe(() => keyframes({ keyframes: [0, 100, 50], duration: 1000, ease: 'easeInOut' }).next(time()))} />
      <Readout label="inertia({velocity}).next(t)" value={safe(() => inertia({ keyframes: [0], velocity: velocity(), power: 0.8, timeConstant: 700 }).next(time()))} />
      <Readout label="getSpringOptions({stiffness})" value={safe(() => getSpringOptions({ stiffness: stiffness(), damping: 12 }))} />
      <Readout label="applyGeneratorOptions({type spring, visualDuration .5, bounce})" value={safe(() => applyGeneratorOptions({ type: 'spring', visualDuration: 0.5, bounce: bounce() }))} />
      <Readout label="isGenerator(spring) / isGenerator('tween')" value={`${isGenerator(spring as never)} / ${isGenerator('tween' as never)}`} />
      <Readout label="createGeneratorEasing(spring options)" value={safe(() => { const e = createGeneratorEasing({ stiffness: stiffness(), damping: 12 } as never, undefined, spring as never); return { type: e.type, duration: e.duration, ease0_5: e.ease(0.5) } })} />
      <Readout label="maxGeneratorDuration" value={String(maxGeneratorDuration)} ok={maxGeneratorDuration === 20000} />
      <h4>Offsets and easing</h4>
      <Readout label="defaultOffset([a,b,c,d])" value={safe(() => defaultOffset(['a', 'b', 'c', 'd']))} />
      <Readout label="fillOffset([0,1] + 2 more)" value={safe(() => { const o = [0, 1]; fillOffset(o, 2); return o })} />
      <Readout label="convertOffsetToTimes([0,.5,1], 2)" value={safe(() => convertOffsetToTimes([0, 0.5, 1], 2))} />
      <Readout label="defaultEasing([0,1,2], 'easeOut')" value={safe(() => defaultEasing([0, 1, 2], easingDefinitionToFunction('easeOut')).length + ' easings')} />
      <Readout label="easingDefinitionToFunction('easeIn')(.5) / bezier" value={`${easingDefinitionToFunction('easeIn')(0.5).toFixed(3)} / ${easingDefinitionToFunction([0.4, 0, 0.2, 1])(0.5).toFixed(3)}`} />
      <Readout label="isBezierDefinition / isEasingArray" value={`${isBezierDefinition([0, 0, 1, 1])} ${isBezierDefinition('linear')} / ${isEasingArray(['easeIn', 'easeOut'])} ${isEasingArray('linear')}`} />
      <Readout label="getEasingForSegment(['easeIn','easeOut'], 1)" value={String(getEasingForSegment(['easeIn', 'easeOut'], 1))} ok={getEasingForSegment(['easeIn', 'easeOut'], 1) === 'easeOut'} />
      <Readout label="isWaapiSupportedEasing(easeIn / circInOut)" value={`${isWaapiSupportedEasing('easeIn')} / ${isWaapiSupportedEasing('circInOut')}`} />
      <Readout label="mapEasingToNativeEasing('easeOut', 500)" value={safe(() => mapEasingToNativeEasing('easeOut', 500))} />
      <Readout label="supportedWaapiEasing keys" value={Object.keys(supportedWaapiEasing).join(' ')} />
      <h4>Transition resolution</h4>
      <Readout label="getFinalKeyframe([0,1,2], repeat 1 reverse)" value={safe(() => getFinalKeyframe([0, 1, 2], { repeat: 1, repeatType: 'reverse' }))} />
      <Readout label="getDefaultTransition('x', [0,1]) / 'opacity'" value={safe(() => [getDefaultTransition('x', { keyframes: [0, 1] } as never).type, getDefaultTransition('opacity', { keyframes: [0, 1] } as never).type])} />
      <Readout label="getValueTransition({x:{duration:2}}, 'x')" value={safe(() => getValueTransition({ x: { duration: 2 }, duration: 1 }, 'x'))} />
      <Readout label="resolveTransition(child, parent)" value={safe(() => resolveTransition({ duration: 2, inherit: true }, { delay: 1, duration: 9 }))} />
      <Readout label="isTransitionDefined({duration}) / ({})" value={`${isTransitionDefined({ duration: 1 })} / ${isTransitionDefined({})}`} />
      <Readout label="makeAnimationInstant({duration: 5})" value={safe(() => { const o: { duration?: number, type?: string } = { duration: 5, type: 'spring' }; makeAnimationInstant(o as never); return o })} />
      <Readout label="getOriginIndex('first' | 'last' | 'center', 5)" value={safe(() => ['first', 'last', 'center'].map(f => getOriginIndex(f as never, 5)))} />
    </>
  )
}
