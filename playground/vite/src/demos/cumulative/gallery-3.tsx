import { createSignal, For, onCleanup, onSettled, Show } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-3',
  title: 'Gallery 3: shared-layout expand',
  group: 'cumulative',
  description: 'Stage 3 of 6. Clicking a tile opens a detail card that shares layoutId with the tile, so it grows from the tile instead of jumping. No presence yet: the overlay mounts and unmounts instantly, only the card travels.',
  covers: ['motion'],
  level: 3,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

export default function Demo() {
  const [open, setOpen] = createSignal<number | null>(null)
  const [opens, setOpens] = createSignal(0)
  const show = (id: number) => {
    setOpen(id)
    setOpens(count => count + 1)
  }
  const close = () => setOpen(null)

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
        <Readout label="open count" value={opens()} />
        <span>Click a tile; close with the button, a backdrop click or Esc.</span>
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
        <Show when={open()}>
          {id => (
            <div class="gal-overlay" data-testid="overlay">
              <div class="gal-backdrop" data-testid="backdrop" onClick={close} />
              <motion.div
                class="gal-card"
                data-testid="card"
                layoutId={`photo-${id()}`}
                style={{ background: photos[id() - 1].background }}
              >
                {photos[id() - 1].title}
                <button type="button" class="btn gal-close" onClick={close}>Close</button>
              </motion.div>
            </div>
          )}
        </Show>
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
