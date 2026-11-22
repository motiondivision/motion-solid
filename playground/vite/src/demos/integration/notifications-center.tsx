import { createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { AnimatePresence, createDomRef, createInView, MotionConfig, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'notifications-center',
  title: 'Notifications center',
  group: 'integration',
  description:
    'Stacked toasts (AnimatePresence popLayout + layout) with auto-dismiss timers that pause on hover, drag-right-to-dismiss, and a heavy panel that only mounts once createInView sees it in the scroller. MotionConfig supplies the default transition; switch it live.',
  covers: ['AnimatePresence', 'MotionConfig', 'createDomRef', 'createInView', 'motion'],
  level: 3,
} as const

type Kind = 'info' | 'success' | 'error'
interface Toast { id: number; kind: Kind; text: string }
const TEXT: Record<Kind, string> = { info: 'Heads up', success: 'Saved', error: 'Something failed' }

const springy = { type: 'spring', stiffness: 500, damping: 30 } as const
const slow = { duration: 0.9, ease: 'linear' } as const

export default function Demo() {
  const [toasts, setToasts] = createSignal<Toast[]>([])
  const [ttl, setTtl] = createSignal(4)
  const [feel, setFeel] = createSignal<'spring' | 'slow'>('spring')
  const [created, setCreated] = createSignal(0)
  const [byTimer, setByTimer] = createSignal(0)
  const [byUser, setByUser] = createSignal(0)
  let nextId = 1
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  onCleanup(() => timers.forEach(clearTimeout))

  const dismiss = (id: number, how: 'timer' | 'user') => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    setToasts(list => {
      if (!list.some(t => t.id === id)) return list
      ;(how === 'timer' ? setByTimer : setByUser)(n => n + 1)
      return list.filter(t => t.id !== id)
    })
  }
  const arm = (id: number) => {
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => dismiss(id, 'timer'), ttl() * 1000))
  }
  const push = (kind: Kind) => {
    const id = nextId++
    setToasts(list => [...list, { id, kind, text: `${TEXT[kind]} #${id}` }].slice(-6))
    setCreated(n => n + 1)
    arm(id)
  }
  const clearAll = () => {
    const ids = toasts().map(t => t.id)
    ids.forEach(id => dismiss(id, 'user'))
  }

  const [scroller, scrollerRef] = createDomRef<HTMLDivElement>()
  const [target, targetRef] = createDomRef<HTMLDivElement>()
  const seen = createInView(target, () => ({ root: scroller(), once: true, amount: 0.6 }))
  const accounted = createMemo(() => created() === toasts().length + byTimer() + byUser())

  return (
    <MotionConfig transition={feel() === 'spring' ? springy : slow}>
      <Controls>
        <Button onClick={() => push('info')}>Info</Button>
        <Button onClick={() => push('success')}>Success</Button>
        <Button onClick={() => push('error')}>Error</Button>
        <Button onClick={() => { push('info'); push('success'); push('error') }}>Burst x3</Button>
        <Button onClick={clearAll}>Clear all</Button>
        <label>
          auto-dismiss {ttl()}s
          <input type="range" min="1" max="10" value={ttl()} onInput={e => setTtl(+e.currentTarget.value)} />
        </label>
        <Button pressed={feel() === 'slow'} onClick={() => setFeel(f => (f === 'spring' ? 'slow' : 'spring'))}>
          Default transition: {feel()}
        </Button>
      </Controls>
      <Controls>
        <Readout label="visible" value={toasts().length} />
        <Readout label="created" value={created()} />
        <Readout label="by timer" value={byTimer()} />
        <Readout label="by user" value={byUser()} />
        <Readout label="created = visible + dismissed" value={accounted() ? 'ok' : 'MISMATCH'} ok={accounted()} />
        <Readout label="lazy panel in view" value={String(seen())} />
      </Controls>
      <Stage height="440px">
        <div class="nc-scroll" ref={scrollerRef} data-testid="scroller">
          <p>Activity log. Scroll down: the panel at the bottom mounts only when it is 60% visible.</p>
          <For each={Array.from({ length: 10 }, (_, i) => i + 1)}>{i => <div class="nc-line">log entry {i}</div>}</For>
          <div ref={targetRef} class="nc-target" data-testid="lazy-target">
            <Show when={seen()} fallback={<span class="empty">not mounted yet</span>}>
              <motion.div class="nc-panel" data-testid="lazy-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                Heavy panel mounted on first view
              </motion.div>
            </Show>
          </div>
        </div>
        <ul class="nc-stack" data-testid="stack">
          <AnimatePresence mode="popLayout">
            <For each={toasts()}>
              {toast => (
                <motion.li
                  layout
                  class="nc-toast"
                  data-kind={toast.kind}
                  data-toast={toast.id}
                  initial={{ opacity: 0, x: 80, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 140 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0, right: 1 }}
                  onDragEnd={(_e: unknown, info: { offset: { x: number } }) => {
                    if (info.offset.x > 100) dismiss(toast.id, 'user')
                  }}
                  onPointerEnter={() => clearTimeout(timers.get(toast.id))}
                  onPointerLeave={() => arm(toast.id)}
                >
                  <span>{toast.text}</span>
                  <button type="button" aria-label={`dismiss ${toast.id}`} onPointerDown={e => e.stopPropagation()} onClick={() => dismiss(toast.id, 'user')}>
                    &times;
                  </button>
                </motion.li>
              )}
            </For>
          </AnimatePresence>
        </ul>
      </Stage>
      <style>{`
        .nc-scroll { width: 55%; height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; }
        .nc-line { padding: 14px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
        .nc-target { min-height: 90px; padding: 16px 0; }
        .nc-panel { background: var(--ok); color: #fff; padding: 20px; border-radius: 8px; }
        .nc-stack { position: absolute; right: 16px; top: 16px; width: 240px; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; z-index: 3; }
        .nc-toast { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; color: #fff; cursor: grab; touch-action: pan-y; background: var(--info); }
        .nc-toast[data-kind=success] { background: var(--ok); }
        .nc-toast[data-kind=error] { background: var(--bad); }
        .nc-toast button { background: rgba(255,255,255,.25); color: #fff; border: 0; border-radius: 4px; cursor: pointer; width: 22px; height: 22px; }
      `}</style>
    </MotionConfig>
  )
}
