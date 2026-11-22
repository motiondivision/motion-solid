import { createSignal, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-4',
  title: 'Gallery 4: AnimatePresence overlay',
  group: 'cumulative',
  description: 'Stage 4 of 6. The backdrop and card now live inside AnimatePresence: the backdrop fades in and out, the card flies back to its tile on exit, and the overlay stays in the DOM until the exit finishes.',
  covers: ['AnimatePresence', 'motion'],
  level: 4,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

export default function Demo() {
  const [open, setOpen] = createSignal<number | null>(null)
  const [exiting, setExiting] = createSignal(false)
  const [exits, setExits] = createSignal(0)

  const show = (id: number) => {
    setExiting(false)
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
        <Readout label="exiting" value={String(exiting())} />
        <Readout label="exit completes" value={exits()} />
        <span>Click a tile; close with the button, a backdrop click or Esc. Try Esc mid-animation and rapid clicks.</span>
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
        <AnimatePresence
          onExitComplete={() => {
            setExits(count => count + 1)
            if (open() === null) setExiting(false)
          }}
        >
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
                />
                <motion.div
                  class="gal-card"
                  data-testid="card"
                  layoutId={`photo-${id()}`}
                  style={{ background: photos[id() - 1].background }}
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
.gal-grid{display:grid;gap:10px;width:100%;grid-template-columns:repeat(4,1fr)}
.gal-cell{aspect-ratio:4/3;position:relative}
.gal-tile{width:100%;height:100%;border:0;border-radius:10px;color:#fff;font:inherit;font-weight:600;display:flex;align-items:flex-end;padding:8px;text-shadow:0 1px 3px #0008;cursor:pointer}
.gal-overlay{position:absolute;inset:0;display:grid;place-items:center;z-index:5}
.gal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.65)}
.gal-card{position:relative;width:min(420px,80%);aspect-ratio:4/3;border-radius:16px;color:#fff;display:flex;align-items:flex-end;padding:16px;font-size:20px;font-weight:700;text-shadow:0 1px 3px #0008;box-shadow:0 20px 60px #0008}
.gal-close{position:absolute;top:8px;right:8px;z-index:6}
`
