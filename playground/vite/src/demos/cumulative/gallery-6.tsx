import { createMemo, createSignal, For, onSettled, Show } from 'solid-js'
import {
  AnimatePresence,
  createMotionValue,
  createMotionValueEvent,
  createReducedMotion,
  createTransform,
  motion,
} from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-6',
  title: 'Gallery 6: keyboard and directional slide',
  group: 'cumulative',
  description: 'Stage 6 of 6. Left/Right arrows (or the buttons) move between photos inside the open card. An inner AnimatePresence with custom + mode (wait, popLayout or sync) slides the old photo out and the new one in, in the direction of travel. Reduced motion (system setting or the checkbox) swaps the slide for a short fade.',
  covers: ['AnimatePresence', 'createMotionValue', 'createMotionValueEvent', 'createReducedMotion', 'createTransform', 'motion'],
  level: 6,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

type Slide = { dir: number; reduced: boolean }
const slideVariants = {
  enter: ({ dir, reduced }: Slide) => ({ x: reduced ? '0%' : `${dir * 100}%`, opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: ({ dir, reduced }: Slide) => ({ x: reduced ? '0%' : `${dir * -100}%`, opacity: 0 }),
}

export default function Demo() {
  const [open, setOpen] = createSignal<number | null>(null)
  const [origin, setOrigin] = createSignal(0)
  const [dir, setDir] = createSignal(1)
  const [mode, setMode] = createSignal<'wait' | 'popLayout' | 'sync'>('wait')
  const [forceReduced, setForceReduced] = createSignal(false)
  const [slideExits, setSlideExits] = createSignal(0)
  const [exiting, setExiting] = createSignal(false)
  const [dismissing, setDismissing] = createSignal(false)
  const [result, setResult] = createSignal('none')
  const [bgOpacity, setBgOpacity] = createSignal(1)

  const systemReduced = createReducedMotion()
  const reduced = () => systemReduced() || forceReduced()
  const custom = createMemo<Slide>(() => ({ dir: dir(), reduced: reduced() }))

  const y = createMotionValue(0)
  const backdropOpacity = createTransform(y, [-260, 0, 260], [0, 1, 0])
  createMotionValueEvent(backdropOpacity, 'change', latest => setBgOpacity(latest))

  const show = (id: number) => {
    setExiting(false)
    setDismissing(false)
    setResult('none')
    y.jump(0)
    setDir(1)
    setOrigin(id)
    setOpen(id)
  }
  const close = () => {
    if (open() === null) return
    setExiting(true)
    setOpen(null)
  }
  const go = (step: 1 | -1) => {
    const current = open()
    if (current === null) return
    setDir(step)
    setOpen(((current - 1 + step + photos.length) % photos.length) + 1)
  }

  onSettled(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') go(1)
      else if (event.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Controls>
        <label>
          Mode
          <select value={mode()} onChange={event => setMode(event.currentTarget.value as 'wait' | 'popLayout' | 'sync')}>
            <option value="wait">wait</option>
            <option value="popLayout">popLayout</option>
            <option value="sync">sync</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={forceReduced()} onChange={event => setForceReduced(event.currentTarget.checked)} />
          Force reduced motion
        </label>
        <Readout label="open photo" value={open() ?? 'none'} />
        <Readout label="direction" value={dir() > 0 ? 'next (+1)' : 'prev (-1)'} />
        <Readout label="reduced (system/forced)" value={`${systemReduced()}/${forceReduced()}`} />
        <Readout label="slide exits" value={slideExits()} />
        <Readout label="backdrop opacity" value={bgOpacity().toFixed(2)} />
        <Readout label="drag result" value={result()} />
        <span>Open a photo, then use Left/Right, Esc, or drag the card vertically.</span>
      </Controls>
      <Stage height="460px">
        <div class="gal-grid">
          <For each={photos}>
            {photo => (
              <div class="gal-cell">
                <Show when={!(open() !== null && origin() === photo.id)}>
                  <motion.button
                    class="gal-tile"
                    data-testid="tile"
                    data-id={photo.id}
                    layoutId={`photo-${photo.id}`}
                    style={{ background: photo.background }}
                    onClick={() => show(photo.id)}
                  >
                    {photo.title}
                  </motion.button>
                </Show>
              </div>
            )}
          </For>
        </div>
        <AnimatePresence onExitComplete={() => exiting() && open() === null && setExiting(false)}>
          <Show when={open()}>

              <div class="gal-overlay" data-testid="overlay">
                <motion.div
                  class="gal-backdrop"
                  data-testid="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, pointerEvents: 'none' }}
                  transition={{ duration: 0.3 }}
                  onClick={close}
                >
                  <motion.div class="gal-dim" data-testid="dim" style={{ opacity: backdropOpacity }} />
                </motion.div>
                <motion.div
                  class="gal-card gal-card-6"
                  data-testid="card"
                  layoutId={`photo-${origin()}`}
                  style={{ y }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.7}
                  dragSnapToOrigin={!dismissing()}
                  onDragEnd={(_, info) => {
                    if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 800) {
                      setDismissing(true)
                      setResult('dismissed')
                      close()
                    } else setResult('snapped back')
                  }}
                  exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.3 } }}
                >
                  <AnimatePresence mode={mode()} initial={false} custom={custom()} onExitComplete={() => setSlideExits(count => count + 1)}>
                    <Show when={open()} keyed>
                      {id => (
                        <motion.div
                          class="gal-slide"
                          data-testid="slide"
                          data-id={id}
                          custom={custom()}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: reduced() ? 0.15 : 0.35, ease: 'easeInOut' }}
                          style={{ background: photos[id - 1].background }}
                        >
                          {photos[id - 1].title}
                        </motion.div>
                      )}
                    </Show>
                  </AnimatePresence>
                  <button type="button" class="btn gal-close" onClick={close}>Close</button>
                  <button type="button" class="btn gal-nav gal-prev" aria-label="Previous photo" onClick={() => go(-1)}>&lt;</button>
                  <button type="button" class="btn gal-nav gal-next" aria-label="Next photo" onClick={() => go(1)}>&gt;</button>
                </motion.div>
              </div>

          </Show>
        </AnimatePresence>
      </Stage>
      <style>{galleryCss}</style>
    </>
  )
}

const galleryCss = `
.gal-dim{position:absolute;inset:0;background:rgba(0,0,0,.65)}
.gal-card{cursor:grab;touch-action:none}
.gal-card-6{overflow:hidden;padding:0}
.gal-slide{position:absolute;inset:0;display:flex;align-items:flex-end;padding:16px;font-size:20px;font-weight:700}
.gal-nav{position:absolute;top:50%;margin-top:-16px;z-index:6;padding:6px 12px}
.gal-prev{left:8px}
.gal-next{right:8px}
.gal-grid{display:grid;gap:10px;width:100%;grid-template-columns:repeat(4,1fr)}
.gal-cell{aspect-ratio:4/3;position:relative}
.gal-tile{width:100%;height:100%;border:0;border-radius:10px;color:#fff;font:inherit;font-weight:600;display:flex;align-items:flex-end;padding:8px;text-shadow:0 1px 3px #0008;cursor:pointer}
.gal-overlay{position:absolute;inset:0;display:grid;place-items:center;z-index:5}
.gal-backdrop{position:absolute;inset:0}
.gal-card{position:relative;width:min(420px,80%);aspect-ratio:4/3;border-radius:16px;color:#fff;display:flex;align-items:flex-end;padding:16px;font-size:20px;font-weight:700;text-shadow:0 1px 3px #0008;box-shadow:0 20px 60px #0008}
.gal-close{position:absolute;top:8px;right:8px;z-index:6}
`
