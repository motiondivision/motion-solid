import { createSignal, onSettled } from 'solid-js'
import {
  DOMVisualElement,
  Feature,
  HTMLVisualElement,
  ObjectVisualElement,
  SVGVisualElement,
  VisualElement,
  WillChangeMotionValue,
  addValueToWillChange,
  animate,
  animateTarget,
  animateVariant,
  animateVisualElement,
  calcChildStagger,
  checkVariantsDidChange,
  collectMotionValues,
  createAnimationControls,
  createAnimationState,
  createWillChange,
  expectsResolvedDragConstraints,
  handOffElementState,
  getFeatureDefinitions,
  getOptimisedAppearId,
  getVariantContext,
  isAnimationControls,
  isControllingVariants,
  isKeyframesTarget,
  isVariantLabel,
  isVariantNode,
  isWillChangeMotionValue,
  motion,
  motionValue,
  optimizedAppearDataAttribute,
  optimizedAppearDataId,
  resolveVariant,
  resolveVariantFromProps,
  setFeatureDefinitions,
  setTarget,
  useMotionContext,
  variantPriorityOrder,
  variantProps,
  visualElementStore,
} from 'motion-solid'
type MotionState = NonNullable<ReturnType<typeof useMotionContext>>
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-variants-internals',
  title: 'Variants and visual-element internals',
  group: 'reference',
  description:
    'Grab the VisualElement behind a motion.div (useMotionContext, visualElementStore) and drive it directly: animateTarget, animateVariant, animateVisualElement, setTarget, resolveVariant(FromProps), createAnimationState. Plus the variant predicates, calcChildStagger, will-change helpers, optimised-appear constants, the feature-definition registry and collectMotionValues.',
  covers: [
    'DOMVisualElement',
    'Feature',
    'HTMLVisualElement',
    'ObjectVisualElement',
    'SVGVisualElement',
    'VisualElement',
    'handOffElementState',
    'WillChangeMotionValue',
    'addValueToWillChange',
    'animate',
    'animateTarget',
    'animateVariant',
    'animateVisualElement',
    'calcChildStagger',
    'checkVariantsDidChange',
    'collectMotionValues',
    'createAnimationControls',
    'createAnimationState',
    'createWillChange',
    'expectsResolvedDragConstraints',
    'getFeatureDefinitions',
    'getOptimisedAppearId',
    'getVariantContext',
    'isAnimationControls',
    'isControllingVariants',
    'isKeyframesTarget',
    'isVariantLabel',
    'isVariantNode',
    'isWillChangeMotionValue',
    'motionValue',
    'optimizedAppearDataAttribute',
    'optimizedAppearDataId',
    'resolveVariant',
    'resolveVariantFromProps',
    'setFeatureDefinitions',
    'setTarget',
    'useMotionContext',
    'variantPriorityOrder',
    'variantProps',
    'visualElementStore',
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

const variants = { small: { scale: 1 }, big: { scale: 1.6 }, spin: (turns: number) => ({ rotate: 90 * turns }) }

/** Child of the motion.div: hands its MotionState to the demo. */
function Grab(props: { onState: (state: MotionState | null) => void }) {
  const state = useMotionContext()
  onSettled(() => { props.onState(state) })
  return null
}

export default function Demo() {
  let motionState: MotionState | null = null
  let dragState: MotionState | null = null
  let svgState: MotionState | null = null
  let boxEl!: HTMLDivElement
  const [ready, setReady] = createSignal(false)
  const [log, setLog] = createSignal('press a button')
  const [facts, setFacts] = createSignal('')
  const willChange = createWillChange()
  const controls = createAnimationControls()

  // The VisualElement exists once mounted; read it when a button is pressed.
  const visualElement = () => visualElementStore.get(boxEl) ?? motionState?.visualElement
  const withElement = (run: (element: NonNullable<ReturnType<typeof visualElement>>) => void) => {
    const element = visualElement()
    if (!element) { setLog('no VisualElement yet'); return }
    run(element)
  }

  const dragVisualElement = () => (dragState?.element ? visualElementStore.get(dragState.element) : undefined)

  // Children settle after this callback, so wait a frame for both MotionStates to arrive.
  onSettled(() => {
    const frame = requestAnimationFrame(() => { setReady(true); collectFacts() })
    return () => cancelAnimationFrame(frame)
  })

  const collectFacts = () => {
    const element = visualElement()
    const before = getFeatureDefinitions()
    setFeatureDefinitions({ ...before, playgroundProbe: { isEnabled: () => false } } as never)
    const during = Object.keys(getFeatureDefinitions()).includes('playgroundProbe')
    setFeatureDefinitions(before)
    collectMotionValues.current = []
    motionValue(1).get()
    motionValue(2).get()
    const collected = collectMotionValues.current.length
    collectMotionValues.current = undefined
    setFacts(JSON.stringify({
      visualElementFound: !!element,
      stateType: motionState?.type,
      instanceOf: {
        VisualElement: element instanceof VisualElement,
        DOMVisualElement: element instanceof DOMVisualElement,
        HTMLVisualElement: element instanceof HTMLVisualElement,
        SVGVisualElement: svgState?.visualElement instanceof SVGVisualElement,
      },
      variantContext: element ? getVariantContext(element as never) ?? null : null,
      visualElementStoreHasBox: !!visualElementStore.get(boxEl),
      featureDefinitions: Object.keys(before),
      featureRoundTrip: during && !Object.keys(getFeatureDefinitions()).includes('playgroundProbe'),
      collectedMotionValuesAfterGet: collected,
      willChangeIsInstance: willChange instanceof WillChangeMotionValue,
    }))
  }

  return (
    <>
      <Controls>
        <Button onClick={() => withElement(element => setLog(`animateTarget -> ${animateTarget(element as never, { x: 120, transition: { duration: 0.4 } }).length} controls`))}>animateTarget x:120</Button>
        <Button onClick={() => withElement(element => { void animateVariant(element as never, 'big').then(() => setLog('animateVariant(big) resolved')) })}>animateVariant big</Button>
        <Button onClick={() => withElement(element => { void animateVisualElement(element as never, 'small').then(() => setLog('animateVisualElement(small) resolved')) })}>animateVisualElement small</Button>
        <Button onClick={() => withElement(element => { setTarget(element as never, { x: 0, rotate: 0 }); setLog('setTarget x:0 rotate:0 (instant)') })}>setTarget reset</Button>
        <Button onClick={() => withElement(element => { void animateVisualElement(element as never, 'spin') ; setLog('animateVisualElement(spin) with custom')})}>animateVisualElement spin</Button>
        <Button onClick={() => withElement(element => { addValueToWillChange(element as never, 'x'); setLog(`addValueToWillChange -> willChange=${String(willChange.get())}`) })}>addValueToWillChange x</Button>
        <Button
          onClick={() =>
            withElement(element => {
              const state = createAnimationState(element as never)
              setLog(`createAnimationState keys: ${Object.keys(state).join(', ')}`)
            })}
        >
          createAnimationState
        </Button>
        <Button
          onClick={() => withElement(element => {
            handOffElementState(boxEl, element as never)
            setLog('handOffElementState(box, visualElement) done: the visual element now renders the values')
          })}
        >
          handOffElementState
        </Button>
        <Button
          onClick={() => {
            class ProbeFeature extends Feature<HTMLElement> {
              mounted = false
              mount() { this.mounted = true }
              unmount() { this.mounted = false }
            }
            withElement(element => {
              const feature = new ProbeFeature(element as never)
              feature.mount()
              const afterMount = feature.mounted
              feature.unmount()
              setLog(`Feature subclass: mounted=${afterMount}, after unmount=${feature.mounted}, node is the visual element: ${(feature as unknown as { node: unknown }).node === element}`)
            })
          }}
        >
          Feature subclass
        </Button>
        <Button
          onClick={() => {
            const subject = { n: 0 }
            const objectElement = new ObjectVisualElement({
              props: {},
              presenceContext: null,
              reducedMotionConfig: 'never',
              visualState: { renderState: { output: {} }, latestValues: { n: 0 } },
            } as never)
            objectElement.mount(subject as never)
            animateTarget(objectElement as never, { n: 10, transition: { duration: 0.3 } } as never)
            setLog(`new ObjectVisualElement mounted on a plain object; animateTarget n -> 10 started (type=${objectElement.type})`)
            setTimeout(() => setLog(text => `${text}; object.n after 500ms = ${subject.n.toFixed(2)}`), 500)
          }}
        >
          ObjectVisualElement
        </Button>
        <Button onClick={() => { void controls.start({ scale: 1.2, transition: { duration: 0.3 } }); setLog('createAnimationControls().start(...) used') }}>controls.start</Button>
      </Controls>
      <motion.div
        ref={boxEl}
        data-testid="variant-box"
        class="box"
        style={{ width: '70px', height: '70px', willChange }}
        variants={variants}
        custom={2}
        initial="small"
        animate={controls as never}
      >
        <Grab onState={state => { motionState = state }} />
      </motion.div>
      <motion.div
        data-testid="drag-box"
        class="box"
        style={{ width: '60px', height: '40px', marginTop: '8px' }}
        drag
        dragConstraints={{ left: 0, right: 100, top: 0, bottom: 0 }}
      >
        <Grab onState={state => { dragState = state }} />
      </motion.div>
      <svg width="60" height="30" viewBox="0 0 60 30">
        <motion.circle data-testid="svg-circle" cx="15" cy="15" r="10" fill="#2563eb" animate={{ r: 12 }}>
          <Grab onState={state => { svgState = state }} />
        </motion.circle>
      </svg>
      <Readout label="log" value={log()} />
      <Readout label="facts" value={facts()} />
      <h4>Resolving</h4>
      <Readout label="resolveVariant(ve, 'big')" value={safe(() => (ready(), resolveVariant(visualElement() as never, 'big')))} />
      <Readout label="resolveVariant(ve, 'spin', 3)" value={safe(() => (ready(), resolveVariant(visualElement() as never, 'spin', 3)))} />
      <Readout label="resolveVariantFromProps(props, 'big')" value={safe(() => resolveVariantFromProps({ variants } as never, 'big'))} />
      <Readout label="variantPriorityOrder" value={variantPriorityOrder.join(' > ')} />
      <Readout label="variantProps" value={variantProps.join(', ')} />
      <h4>Predicates</h4>
      <Readout label="isVariantLabel('a') / (['a','b']) / ({})" value={`${isVariantLabel('a')} / ${isVariantLabel(['a', 'b'])} / ${isVariantLabel({})}`} ok={isVariantLabel('a') && !isVariantLabel({})} />
      <Readout label="isControllingVariants / isVariantNode" value={`${isControllingVariants({ animate: 'big' } as never)} / ${isVariantNode({ variants } as never)}`} />
      <Readout label="checkVariantsDidChange('a','b') / ('a','a')" value={`${checkVariantsDidChange('a', 'b')} / ${checkVariantsDidChange('a', 'a')}`} ok={checkVariantsDidChange('a', 'b') && !checkVariantsDidChange('a', 'a')} />
      <Readout label="isKeyframesTarget([0,1]) / (1)" value={`${isKeyframesTarget([0, 1] as never)} / ${isKeyframesTarget(1 as never)}`} />
      <Readout label="isAnimationControls(controls) / ({})" value={`${isAnimationControls(controls)} / ${isAnimationControls({})}`} ok={isAnimationControls(controls) && !isAnimationControls({})} />
      <Readout label="isWillChangeMotionValue(createWillChange()) / (motionValue)" value={`${isWillChangeMotionValue(willChange)} / ${isWillChangeMotionValue(motionValue(0))}`} />
      <Readout label="calcChildStagger({box, drag box}, drag box, 0.1, 0.05)" value={safe(() => (ready(), calcChildStagger(new Set([visualElement(), dragVisualElement()]) as never, dragVisualElement() as never, 0.1, 0.05, 1)))} />
      <Readout label="expectsResolvedDragConstraints" value={`${expectsResolvedDragConstraints({ dragConstraints: { current: boxEl }, onMeasureDragConstraints: () => {} } as never)} / ${expectsResolvedDragConstraints({ dragConstraints: { left: 0 } } as never)}`} />
      <Readout label="optimised appear constants" value={`${optimizedAppearDataAttribute} / ${optimizedAppearDataId} / id of {props:{attr:'abc'}} = ${String(getOptimisedAppearId({ props: { [optimizedAppearDataAttribute]: 'abc' } } as never))}`} />
    </>
  )
}
