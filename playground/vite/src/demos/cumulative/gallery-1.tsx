import { createSignal, For } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'gallery-1',
  title: 'Gallery 1: static grid',
  group: 'cumulative',
  description: 'Stage 1 of 6. A plain grid of gradient tiles rendered with motion.div and no animation. Baseline for the later stages.',
  covers: ['motion'],
  level: 1,
} as const

const photos = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Photo ${i + 1}`,
  background: `linear-gradient(135deg, hsl(${i * 30} 80% 60%), hsl(${i * 30 + 50} 70% 38%))`,
}))

export default function Demo() {
  const [columns, setColumns] = createSignal(4)

  return (
    <>
      <Controls>
        <label>
          Columns
          <select value={String(columns())} onChange={event => setColumns(Number(event.currentTarget.value))}>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        <Readout label="tiles" value={photos.length} />
        <Readout label="columns" value={columns()} />
      </Controls>
      <Stage height="420px">
        <div class="gal-grid" style={{ 'grid-template-columns': `repeat(${columns()}, 1fr)` }}>
          <For each={photos}>
            {photo => (
              <motion.div class="gal-tile" data-testid="tile" data-id={photo.id} style={{ background: photo.background }}>
                {photo.title}
              </motion.div>
            )}
          </For>
        </div>
      </Stage>
      <style>{galleryCss}</style>
    </>
  )
}

const galleryCss = `
.gal-grid{display:grid;gap:10px;width:100%}
.gal-tile{aspect-ratio:4/3;border-radius:10px;color:#fff;font-weight:600;display:flex;align-items:flex-end;padding:8px;text-shadow:0 1px 3px #0008}
`
