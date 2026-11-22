import { createSignal, Errored, For, Show } from 'solid-js'
import { domAnimation, domMax, domMin, LazyMotion, m, motion } from 'motion-solid'
import type { FeatureBundle } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-lazy-motion',
  title: 'LazyMotion + m (bundles, async, strict)',
  group: 'reference',
  description: 'm.div under domMin / domAnimation / domMax (hover and drag work only where the bundle ships them), a loader function and a promise that resolve late, and strict mode (m is fine, full motion throws).',
  covers: ['LazyMotion', 'm', 'motion', 'domMin', 'domAnimation', 'domMax'],
} as const

const bundles: Array<[string, FeatureBundle]> = [['domMin', domMin], ['domAnimation', domAnimation], ['domMax', domMax]]

function Probe(props: { name: string, features: FeatureBundle }) {
  const [on, setOn] = createSignal(false)
  const [hovers, setHovers] = createSignal(0)
  const [drags, setDrags] = createSignal(0)
  return (
    <div class="readout" style={{ 'flex-direction': 'column', 'align-items': 'flex-start', gap: '6px', padding: '8px' }}>
      <b>{props.name}</b>
      <LazyMotion features={props.features}>
        <m.div
          data-testid={`probe-${props.name}`}
          class="box"
          style={{ width: '80px', height: '50px' }}
          animate={{ x: on() ? 60 : 0, rotate: on() ? 10 : 0 }}
          whileHover={{ scale: 1.2 }}
          drag
          dragSnapToOrigin
          onHoverStart={() => setHovers(n => n + 1)}
          onDragStart={() => setDrags(n => n + 1)}
        />
      </LazyMotion>
      <Button onClick={() => setOn(v => !v)}>animate</Button>
      <Readout label="hover events" value={hovers()} />
      <Readout label="drag events" value={drags()} />
    </div>
  )
}

export default function Demo() {
  const [loaderOn, setLoaderOn] = createSignal(false)
  const [loaderState, setLoaderState] = createSignal('idle')
  const [promiseOn, setPromiseOn] = createSignal(false)
  const [promiseState, setPromiseState] = createSignal('idle')
  const [boom, setBoom] = createSignal(false)
  const [loaderTarget, setLoaderTarget] = createSignal(false)

  const loader = () => {
    setLoaderState('loading')
    return new Promise<FeatureBundle>(resolve => setTimeout(() => { setLoaderState('loaded'); resolve(domAnimation) }, 1200))
  }
  // The promise is created in the click handler: creating it while rendering would write a signal in an owned scope.
  const [promise, setPromise] = createSignal<Promise<FeatureBundle>>()
  const startPromise = () => {
    setPromiseState('loading')
    setPromise(new Promise<FeatureBundle>((resolve) => {
      setTimeout(() => { setPromiseState('loaded'); resolve(domAnimation) }, 1200)
    }))
    setPromiseOn(true)
  }

  return (
    <>
      <Controls>
        <span>Hover and drag each box. domMin: neither fires. domAnimation: hover only. domMax: both.</span>
      </Controls>
      <Stage height="220px">
        <For each={bundles}>{([name, features]) => <Probe name={name} features={features} />}</For>
      </Stage>

      <Controls>
        <Button onClick={() => { setLoaderOn(true); setLoaderTarget(false) }} disabled={loaderOn()}>Mount with loader fn</Button>
        <Button onClick={() => setLoaderTarget(v => !v)} disabled={!loaderOn()}>animate x</Button>
        <Readout label="loader" value={loaderState()} ok={loaderState() === 'loaded'} />
        <Button onClick={startPromise} disabled={promiseOn()}>Mount with promise</Button>
        <Readout label="promise" value={promiseState()} ok={promiseState() === 'loaded'} />
      </Controls>
      <Stage height="150px">
        <Show when={loaderOn()}>
          <LazyMotion features={loader}>
            <m.div data-testid="async-loader" class="box" style={{ width: '80px', height: '50px' }} initial={{ opacity: 0.3 }} animate={{ opacity: 1, x: loaderTarget() ? 120 : 0 }} />
          </LazyMotion>
        </Show>
        <Show when={promiseOn() && promise()}>
          <LazyMotion features={promise()!}>
            <m.div data-testid="async-promise" class="box" style={{ width: '80px', height: '50px', background: 'var(--info)' }} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} />
          </LazyMotion>
        </Show>
      </Stage>

      <Controls>
        <span>strict: m is allowed, a full motion component throws (caught by Errored below).</span>
        <Button onClick={() => setBoom(v => !v)} pressed={boom()}>Render full motion.div under strict (expects an error)</Button>
      </Controls>
      <Stage height="110px">
        <LazyMotion features={domMax} strict>
          <m.div data-testid="strict-m" class="box" style={{ width: '80px', height: '50px' }} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} />
          <Show when={boom()}>
            <Errored fallback={(err, reset) => <div data-testid="strict-error" style={{ color: 'var(--bad)', 'font-size': '12px' }}>caught: {String((err() as Error).message).slice(0, 90)} <button onClick={() => { setBoom(false); reset() }}>reset</button></div>}>
              <motion.div data-testid="strict-full" class="box" animate={{ opacity: 1 }} />
            </Errored>
          </Show>
        </LazyMotion>
      </Stage>
    </>
  )
}
