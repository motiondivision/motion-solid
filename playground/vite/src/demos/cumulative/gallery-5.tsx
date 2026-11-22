import { createSignal, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, createMotionValue, createMotionValueEvent, createTransform, motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-5',
  title: 'Gallery 5: drag to dismiss',
  group: 'cumulative',
  description: 'Stage 5 of 6. The open card can be dragged vertically. A createMotionValue y feeds a createTransform that fades a dim layer over the backdrop, so the backdrop opacity follows the drag distance. Release past 120px (or a fast flick) dismisses the card back to its tile; a shorter drag snaps back.',
  covers: ['AnimatePresence', 'createMotionValue', 'createMotionValueEvent', 'createTransform', 'motion'],
  level: 5,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

export default function Demo() {
  const [open, setOpen] = createSignal<number | null>(null)
  const [exiting, setExiting] = createSignal(false)
  const [dismissing, setDismissing] = createSignal(false)
  const [result, setResult] = createSignal('none')
  const [bgOpacity, setBgOpacity] = createSignal(1)

  const y = createMotionValue(0)
  const backdropOpacity = createTransform(y, [-260, 0, 260], [0, 1, 0])
  createMotionValueEvent(backdropOpacity, 'change', latest => setBgOpacity(latest))

  const show = (id: number) => {
    setExiting(false)
    setDismissing(false)
    setResult('none')
    y.jump(0)
    setOpen(id)
  }
  const close = () => {
    if (open() === null) return
    setExiting(true)
    setOpen(null)
  }

  onSettled(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Controls>
        <Readout label="open photo" value={open() ?? 'none'} />
        <Readout label="backdrop opacity" value={bgOpacity().toFixed(2)} />
        <Readout label="drag result" value={result()} />
        <span>Open a photo, then drag the card up or down; release to dismiss or snap back. Esc and the buttons still close it.</span>
      </Controls>
      <Stage height="460px">
        <div class="gal-grid">
          <For each={photos}>
            {photo => (
              <div class="gal-cell">
                <Show when={open() !== photo.id}>
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
            {id => (
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
                  class="gal-card"
                  data-testid="card"
                  layoutId={`photo-${id()}`}
                  style={{ y, background: photos[id() - 1].background }}
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
                  {photos[id() - 1].title}
                  <button type="button" class="btn gal-close" onClick={close}>Close</button>
                </motion.div>
              </div>
            )}
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
.gal-grid{display:grid;gap:10px;width:100%;grid-template-columns:repeat(4,1fr)}
.gal-cell{aspect-ratio:4/3;position:relative}
.gal-tile{width:100%;height:100%;border:0;border-radius:10px;color:#fff;font:inherit;font-weight:600;display:flex;align-items:flex-end;padding:8px;text-shadow:0 1px 3px #0008;cursor:pointer}
.gal-overlay{position:absolute;inset:0;display:grid;place-items:center;z-index:5}
.gal-backdrop{position:absolute;inset:0}
.gal-card{position:relative;width:min(420px,80%);aspect-ratio:4/3;border-radius:16px;color:#fff;display:flex;align-items:flex-end;padding:16px;font-size:20px;font-weight:700;text-shadow:0 1px 3px #0008;box-shadow:0 20px 60px #0008}
.gal-close{position:absolute;top:8px;right:8px;z-index:6}
`
