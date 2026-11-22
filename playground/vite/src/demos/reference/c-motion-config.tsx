import { createSignal, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, MotionConfig, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-motion-config',
  title: 'MotionConfig (every prop)',
  group: 'reference',
  description: 'transition, reducedMotion, skipAnimations, nonce and inViewOptions on a MotionConfig; nested config inheritance; the deprecated reduceMotion alias. Boxes report how long their animation took.',
  covers: ['MotionConfig', 'motion', 'AnimatePresence'],
  expects: ['Reduced Motion enabled'],
} as const

const presets = {
  inherit: undefined,
  'tween 1.5s': { duration: 1.5, ease: 'linear' },
  'tween 0.2s': { duration: 0.2, ease: 'linear' },
  spring: { type: 'spring', stiffness: 120, damping: 12 },
} as const
type Preset = keyof typeof presets

/** A box that animates between two targets and reports how long its animation took. */
function Timed(props: { label: string, on: boolean, prop: 'x' | 'opacity', start: () => number }) {
  const [ms, setMs] = createSignal<number | undefined>()
  return (
    <div style={{ display: 'grid', gap: '4px', width: '170px' }}>
      <motion.div
        data-testid={`box-${props.label}`}
        class="box"
        style={{ width: '60px', height: '40px' }}
        animate={props.prop === 'x' ? { x: props.on ? 100 : 0 } : { opacity: props.on ? 1 : 0.2 }}
        onAnimationComplete={() => setMs(Math.round(performance.now() - props.start()))}
      />
      <Readout label={`${props.label} ms`} value={ms() === undefined ? '-' : ms()} />
    </div>
  )
}

export default function Demo() {
  const [on, setOn] = createSignal(false)
  let t0 = 0
  const [preset, setPreset] = createSignal<Preset>('tween 1.5s')
  const [reduced, setReduced] = createSignal<'inherit' | 'user' | 'never' | 'always'>('inherit')
  const [skip, setSkip] = createSignal<boolean | undefined>(undefined)
  const [nonce, setNonce] = createSignal('abc123')
  const [amount, setAmount] = createSignal<'some' | 'all'>('some')
  const [deprecated, setDeprecated] = createSignal(false)
  const [popItems, setPopItems] = createSignal([1, 2, 3])
  const [seenNonce, setSeenNonce] = createSignal('(remove an item)')
  const [inView, setInView] = createSignal(false)
  let scroller!: HTMLDivElement

  onSettled(() => {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLStyleElement && node.textContent?.includes('data-motion-pop-id'))
            setSeenNonce(`style.nonce = "${node.nonce}"`)
        })
      }
    })
    observer.observe(document.head, { childList: true })
    return () => observer.disconnect()
  })

  return (
    <>
      <Controls>
        <Button pressed={on()} onClick={() => { t0 = performance.now(); setOn(v => !v) }}>Toggle both boxes</Button>
        <label>transition
          <select onChange={e => setPreset(e.currentTarget.value as Preset)} value={preset()}>
            <For each={Object.keys(presets)}>{k => <option>{k}</option>}</For>
          </select>
        </label>
        <label>reducedMotion
          <select onChange={e => setReduced(e.currentTarget.value as any)} value={reduced()}>
            <option>inherit</option><option>user</option><option>never</option><option>always</option>
          </select>
        </label>
        <label>skipAnimations
          <select onChange={e => setSkip(e.currentTarget.value === 'inherit' ? undefined : e.currentTarget.value === 'true')} value={String(skip() ?? 'inherit')}>
            <option>inherit</option><option>true</option><option>false</option>
          </select>
        </label>
        <label>nonce <input value={nonce()} onInput={e => setNonce(e.currentTarget.value)} size={8} /></label>
        <label>inView amount
          <select onChange={e => setAmount(e.currentTarget.value as any)} value={amount()}>
            <option>some</option><option>all</option>
          </select>
        </label>
      </Controls>

      <MotionConfig
        transition={presets[preset()] as any}
        reducedMotion={reduced() === 'inherit' ? undefined : reduced() as 'user' | 'never' | 'always'}
        skipAnimations={skip()}
        nonce={nonce()}
        inViewOptions={{ amount: amount(), root: scroller }}
      >
        <Stage height="190px">
          <Timed label="x (transform)" on={on()} prop="x" start={() => t0} />
          <Timed label="opacity" on={on()} prop="opacity" start={() => t0} />
          <div style={{ display: 'grid', gap: '4px' }}>
            <b style={{ 'font-size': '12px' }}>nested MotionConfig: only transition 0.3s set, rest inherited</b>
            <MotionConfig transition={{ duration: 0.3, ease: 'linear' }}>
              <Timed label="nested x" on={on()} prop="x" start={() => t0} />
            </MotionConfig>
          </div>
        </Stage>
        <Controls>
          <b>inViewOptions</b>
          <Button onClick={() => { scroller.scrollTop = 100 }}>Scroll: target 60% visible</Button>
          <Button onClick={() => { scroller.scrollTop = 170 }}>Scroll: target fully visible</Button>
          <Button onClick={() => { scroller.scrollTop = 0 }}>Scroll to top</Button>
          <Readout label="in view (amount)" value={`${inView()} (${amount()})`} ok={inView()} />
        </Controls>
        <Stage height="150px">
          <div ref={scroller} data-testid="scroller" style={{ height: '120px', width: '260px', overflow: 'auto', border: '1px solid var(--border)' }}>
            <div style={{ height: '160px' }}>spacer (scroll down)</div>
            <motion.div
              data-testid="inview-target"
              style={{ height: '100px', background: 'var(--box)', color: '#fff' }}
              whileInView={{ opacity: 1 }}
              initial={{ opacity: 0.4 }}
              onViewportEnter={() => setInView(true)}
              onViewportLeave={() => setInView(false)}
            >target</motion.div>
            <div style={{ height: '120px' }} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <Button onClick={() => setPopItems(items => items.slice(1))} disabled={popItems().length === 0}>Remove first popLayout item (nonce)</Button>
            <Button onClick={() => setPopItems([1, 2, 3])}>Reset items</Button>
            <Readout label="pop style" value={seenNonce()} ok={seenNonce().includes(nonce()) ? true : undefined} />
            <div style={{ position: 'relative', display: 'flex', gap: '6px' }}>
              <AnimatePresence mode="popLayout">
                <For each={popItems()}>
                  {item => <motion.div class="box" layout exit={{ opacity: 0 }} transition={{ duration: 0.8 }} style={{ width: '40px', height: '40px' }}>{item}</motion.div>}
                </For>
              </AnimatePresence>
            </div>
          </div>
        </Stage>
      </MotionConfig>

      <Controls>
        <Button pressed={deprecated()} onClick={() => setDeprecated(v => !v)}>Mount deprecated reduceMotion="always" (expects 1 console warning)</Button>
      </Controls>
      <Show when={deprecated()}>
        <MotionConfig reduceMotion="always">
          <Stage height="70px">
            <motion.div class="box" style={{ width: '40px', height: '40px' }} animate={{ x: on() ? 100 : 0 }} transition={{ duration: 1 }} />
          </Stage>
        </MotionConfig>
      </Show>
    </>
  )
}
