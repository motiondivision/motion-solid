import { createSignal, For } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-2',
  title: 'Gallery 2: hover and tap feedback',
  group: 'cumulative',
  description: 'Stage 2 of 6. Adds whileHover, whileTap, whileFocus and hover/tap callbacks to every tile. Hover scales up, press scales down.',
  covers: ['motion'],
  level: 2,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

export default function Demo() {
  const [hovered, setHovered] = createSignal<number | null>(null)
  const [pressed, setPressed] = createSignal(false)
  const [taps, setTaps] = createSignal(0)
  const [last, setLast] = createSignal<number | null>(null)

  return (
    <>
      <Controls>
        <Readout label="hovered" value={hovered() ?? 'none'} />
        <Readout label="pressed" value={String(pressed())} />
        <Readout label="taps" value={taps()} />
        <Readout label="last tapped" value={last() ?? 'none'} />
        <span>Hover, press (hold the mouse down), Tab to focus.</span>
      </Controls>
      <Stage height="420px">
        <div class="gal-grid">
          <For each={photos}>
            {photo => (
              <div class="gal-cell">
                <motion.button
                  class="gal-tile"
                  data-testid="tile"
                  data-id={photo.id}
                  style={{ background: photo.background }}
                  whileHover={{ scale: 1.08, zIndex: 2 }}
                  whileTap={{ scale: 0.94 }}
                  whileFocus={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  onHoverStart={() => setHovered(photo.id)}
                  onHoverEnd={() => setHovered(null)}
                  onTapStart={() => setPressed(true)}
                  onTap={() => {
                    setTaps(count => count + 1)
                    setLast(photo.id)
                    setPressed(false)
                  }}
                  onTapCancel={() => setPressed(false)}
                >
                  {photo.title}
                </motion.button>
              </div>
            )}
          </For>
        </div>
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
