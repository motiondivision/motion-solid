import { createSignal, flush, For, onSettled, Show } from 'solid-js'
import { createMotionTemplate, createScroll, createSpring, createTransform, frameData, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'listener-leak-check',
  title: 'Listener / frame-loop leak check',
  group: 'stress',
  description:
    'Instruments addEventListener/removeEventListener and requestAnimationFrame while gesture, drag, scroll and in-view subjects mount and unmount. After unmount the net listener count must return to the baseline and Motion\'s frame loop must go idle.',
  covers: ['createMotionTemplate', 'createScroll', 'createSpring', 'createTransform', 'frameData', 'motion'],
} as const

// ---- instrumentation (installed while this demo is mounted, restored on unmount) ----
const ids = new WeakMap<object, number>()
let nextId = 1
const idOf = (o: object) => {
  let id = ids.get(o)
  if (!id) ids.set(o, (id = nextId++))
  return id
}
const label = (t: object) => (t === window ? 'window' : t === document ? 'document' : t.constructor.name)

const live = new Map<string, string>() // key -> "Target.type"
const raf = { calls: 0, pending: new Set<number>() }

function install() {
  const proto = EventTarget.prototype
  const add = proto.addEventListener
  const remove = proto.removeEventListener
  const rafOriginal = window.requestAnimationFrame
  const cafOriginal = window.cancelAnimationFrame
  const keyOf = (target: object, type: string, listener: object, options: unknown) =>
    `${idOf(target)}|${type}|${idOf(listener)}|${typeof options === 'boolean' ? options : !!(options as AddEventListenerOptions | undefined)?.capture}`

  proto.addEventListener = function (this: EventTarget, type: string, listener: any, options?: any) {
    if (listener && (typeof listener === 'function' || typeof listener === 'object') && !options?.once) {
      const key = keyOf(this, type, listener, options)
      live.set(key, `${label(this)}.${type}`)
      options?.signal?.addEventListener('abort', () => live.delete(key), { once: true })
    }
    return add.call(this, type, listener, options)
  } as typeof proto.addEventListener
  proto.removeEventListener = function (this: EventTarget, type: string, listener: any, options?: any) {
    if (listener && (typeof listener === 'function' || typeof listener === 'object')) live.delete(keyOf(this, type, listener, options))
    return remove.call(this, type, listener, options)
  } as typeof proto.removeEventListener
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    raf.calls++
    const id: number = rafOriginal.call(window, t => {
      raf.pending.delete(id)
      cb(t)
    })
    raf.pending.add(id)
    return id
  }
  window.cancelAnimationFrame = (id: number) => {
    raf.pending.delete(id)
    cafOriginal.call(window, id)
  }
  return () => {
    proto.addEventListener = add
    proto.removeEventListener = remove
    window.requestAnimationFrame = rafOriginal
    window.cancelAnimationFrame = cafOriginal
    live.clear()
    raf.pending.clear()
  }
}

// ---- subjects ----
type Subject = 'gestures' | 'drag' | 'scroll' | 'inview'
const SUBJECTS: Subject[] = ['gestures', 'drag', 'scroll', 'inview']

function Gestures() {
  return (
    <motion.button
      class="btn"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      whileFocus={{ outline: '2px solid #fff' }}
      onTap={() => {}}
      onHoverStart={() => {}}
    >
      gestures
    </motion.button>
  )
}
function Drag() {
  return (
    <motion.div class="box leak-small" drag dragConstraints={{ left: -80, right: 80, top: -20, bottom: 20 }} whileDrag={{ scale: 1.15 }} data-testid="leak-drag" />
  )
}
function Scroll() {
  let box: HTMLDivElement | undefined
  const page = createScroll()
  const inner = createScroll(() => ({ container: () => box }))
  const scaleX = createSpring(inner.scrollYProgress, { stiffness: 120, damping: 30 })
  const hue = createTransform(page.scrollYProgress, [0, 1], [200, 320])
  const background = createMotionTemplate`hsl(${hue} 70% 50%)`
  return (
    <div ref={box} class="leak-scroll">
      <motion.div style={{ scaleX, background, transformOrigin: '0 50%', height: '6px', position: 'sticky', top: '0' }} />
      <div style={{ height: '300px' }} />
    </div>
  )
}
function InView() {
  return <motion.div class="box leak-small" initial={{ opacity: 0.3 }} whileInView={{ opacity: 1 }} onViewportEnter={() => {}} />
}
const views: Record<Subject, () => any> = { gestures: Gestures, drag: Drag, scroll: Scroll, inview: InView }

export default function Demo() {
  const [selected, setSelected] = createSignal<Subject[]>(['gestures', 'drag', 'scroll', 'inview'])
  const [mounted, setMounted] = createSignal(false)
  const [cycles, setCycles] = createSignal(0)
  const [cycling, setCycling] = createSignal(false)
  const [snap, setSnap] = createSignal({ listeners: 0, base: 0, rafPending: 0, rafCalls: 0, loopIdle: true, by: '' as string, sinceUnmount: 0 })
  let baseline = -1
  let unmountedAt = performance.now()
  let alive = true
  let lastTs = frameData.timestamp
  let stopCycle = false

  onSettled(() => {
    const uninstall = install()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'u') flush(() => setMounted(false))
      if (e.key === 'm') flush(() => setMounted(true))
    }
    window.addEventListener('keydown', onKey)
    const timer = setInterval(() => {
      const counts = new Map<string, number>()
      live.forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1))
      const ts = frameData.timestamp
      const loopIdle = ts === lastTs
      lastTs = ts
      setSnap({
        listeners: live.size,
        base: Math.max(baseline, 0),
        rafPending: raf.pending.size,
        rafCalls: raf.calls,
        loopIdle,
        by: [...counts].sort().map(([k, v]) => `${k}x${v}`).join(' '),
        sinceUnmount: mounted() ? 0 : performance.now() - unmountedAt,
      })
    }, 150)
    return () => {
      alive = false
      clearInterval(timer)
      window.removeEventListener('keydown', onKey)
      uninstall()
    }
  })

  const setMountedTracked = (value: boolean) => {
    if (value && baseline < 0) baseline = live.size
    if (!value) unmountedAt = performance.now()
    flush(() => setMounted(value))
  }
  const toggle = () => setMountedTracked(!mounted())
  const cycle = async (n: number) => {
    if (cycling()) return
    setCycling(true)
    stopCycle = false
    for (let i = 0; i < n && alive && !stopCycle; i++) {
      setMountedTracked(true)
      await new Promise(r => setTimeout(r, 70))
      setMountedTracked(false)
      await new Promise(r => setTimeout(r, 70))
      setCycles(value => value + 1)
    }
    setCycling(false)
  }
  const pick = (s: Subject) => setSelected(list => (list.includes(s) ? list.filter(x => x !== s) : [...list, s]))

  const net = () => snap().listeners - snap().base
  const quiet = () => !mounted() && !cycling() && baseline >= 0 && snap().sinceUnmount > 600
  const verdict = (ok: boolean) => (quiet() ? (ok ? 'PASS' : 'FAIL') : mounted() || cycling() ? 'mounted / cycling' : 'waiting')
  const pending = () => (quiet() ? undefined : undefined)
  void pending

  return (
    <>
      <Controls>
        <Button onClick={toggle}>{mounted() ? 'Unmount (or press u)' : 'Mount (or press m)'}</Button>
        <Button disabled={cycling()} onClick={() => cycle(20)}>Cycle 20x</Button>
        <Button disabled={!cycling()} onClick={() => (stopCycle = true)}>Stop</Button>
        <span>subjects:</span>
        <For each={SUBJECTS}>
          {s => (
            <Button pressed={selected().includes(s)} onClick={() => pick(s)}>
              {s}
            </Button>
          )}
        </For>
      </Controls>
      <Controls>
        <Readout label="mounted" value={String(mounted())} />
        <Readout label="cycles" value={cycles()} />
        <Readout label="baseline listeners" value={snap().base} />
        <Readout label="live listeners (since install)" value={snap().listeners} />
        <Readout label="net vs baseline" value={net()} />
        <Readout label="rAF pending (window.rAF)" value={snap().rafPending} />
        <Readout label="rAF calls" value={snap().rafCalls} />
        <Readout label="Motion frame loop" value={snap().loopIdle ? 'idle' : 'running'} />
      </Controls>
      <Controls>
        <Readout label="instrument sees listeners while mounted" value={mounted() ? (net() > 0 ? 'PASS' : 'FAIL') : 'n/a'} ok={mounted() ? net() > 0 : undefined} />
        <Readout label="net listeners == 0 after unmount" value={verdict(net() === 0)} ok={quiet() ? net() === 0 : undefined} />
        <Readout label="no rAF pending after unmount" value={verdict(snap().rafPending === 0)} ok={quiet() ? snap().rafPending === 0 : undefined} />
        <Readout label="Motion frame loop idle after unmount" value={verdict(snap().loopIdle)} ok={quiet() ? snap().loopIdle : undefined} />
      </Controls>
      <Controls>
        <Readout label="listeners by target.type" value={snap().by || '(none)'} />
      </Controls>
      <Stage height="190px">
        <Show when={mounted()}>
          <For each={SUBJECTS.filter(s => selected().includes(s))}>{s => views[s]()}</For>
        </Show>
        <style>{`.leak-small{width:50px;height:50px}.leak-scroll{width:200px;height:90px;overflow:auto;border:1px solid var(--border)}`}</style>
      </Stage>
    </>
  )
}
