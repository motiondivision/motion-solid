import { createSignal, For, Show } from 'solid-js'
import {
  AnimatePresence,
  createMotionTemplate,
  createMotionValue,
  createSpring,
  createTransform,
  LayoutGroup,
  motion,
  Reorder,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'kanban-board',
  title: 'Kanban board',
  group: 'integration',
  description:
    'Drag cards up/down to reorder a column, or drag them sideways into another column (layoutId carries them across). Delete exits via AnimatePresence; the column header springs when it receives a card.',
  covers: [
    'AnimatePresence',
    'LayoutGroup',
    'Reorder',
    'motion',
    'createMotionValue',
    'createSpring',
    'createTransform',
    'createMotionTemplate',
  ],
  level: 3,
} as const

type ColId = 'todo' | 'doing' | 'done'
type Cols = Record<ColId, string[]>
const COLS: { id: ColId; title: string }[] = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
]
const initial = (): Cols => ({ todo: ['Write spec', 'Design API', 'Set up CI'], doing: ['Build demo'], done: ['Init repo'] })

export default function Demo() {
  const [cols, setCols] = createSignal<Cols>(initial())
  const [lastMove, setLastMove] = createSignal('none')
  let nextId = 1
  const total = () => COLS.reduce((n, c) => n + cols()[c.id].length, 0)
  const [expected, setExpected] = createSignal(5)

  const pulses = {
    todo: createMotionValue(0),
    doing: createMotionValue(0),
    done: createMotionValue(0),
  }
  const springs = {
    todo: createSpring(pulses.todo, { stiffness: 500, damping: 12 }),
    doing: createSpring(pulses.doing, { stiffness: 500, damping: 12 }),
    done: createSpring(pulses.done, { stiffness: 500, damping: 12 }),
  }
  const scales = {
    todo: createTransform(springs.todo, [0, 1], [1, 1.12]),
    doing: createTransform(springs.doing, [0, 1], [1, 1.12]),
    done: createTransform(springs.done, [0, 1], [1, 1.12]),
  }
  const lightness = {
    todo: createTransform(springs.todo, [0, 1], [92, 62]),
    doing: createTransform(springs.doing, [0, 1], [92, 62]),
    done: createTransform(springs.done, [0, 1], [92, 62]),
  }
  const bgs = {
    todo: createMotionTemplate`hsl(150 60% ${lightness.todo}%)`,
    doing: createMotionTemplate`hsl(150 60% ${lightness.doing}%)`,
    done: createMotionTemplate`hsl(150 60% ${lightness.done}%)`,
  }
  const pulse = (id: ColId) => {
    pulses[id].set(1)
    setTimeout(() => pulses[id].set(0), 160)
  }

  const move = (card: string, from: ColId, to: ColId, index?: number) => {
    setCols(prev => {
      const next: Cols = { todo: [...prev.todo], doing: [...prev.doing], done: [...prev.done] }
      next[from] = next[from].filter(c => c !== card)
      next[to].splice(index ?? next[to].length, 0, card)
      return next
    })
    setLastMove(`${card}: ${from} -> ${to}`)
    pulse(to)
  }
  const remove = (card: string, from: ColId) => {
    setCols(prev => ({ ...prev, [from]: prev[from].filter(c => c !== card) }))
    setExpected(n => n - 1)
    setLastMove(`${card}: deleted`)
  }
  const add = () => {
    const title = `Task ${nextId++}`
    setCols(prev => ({ ...prev, todo: [...prev.todo, title] }))
    setExpected(n => n + 1)
    pulse('todo')
  }
  const dropTarget = (x: number): ColId | undefined => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-col]')) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right) return el.dataset.col as ColId
    }
  }
  const dropIndex = (to: ColId, y: number) => {
    const els = [...document.querySelectorAll<HTMLElement>(`[data-col="${to}"] [data-card]`)]
    return els.filter(el => {
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2 < y
    }).length
  }

  return (
    <>
      <Controls>
        <Button onClick={add}>Add card</Button>
        <Button onClick={() => { setCols(initial()); setExpected(5); setLastMove('reset') }}>Reset</Button>
        <For each={COLS}>{c => <Readout label={c.id} value={cols()[c.id].length} />}</For>
        <Readout label="cards conserved" value={total() === expected() ? 'yes' : 'NO'} ok={total() === expected()} />
        <Readout label="last move" value={lastMove()} />
        <Readout label="order" value={COLS.map(c => cols()[c.id].join('|')).join(' / ')} />
      </Controls>
      <Stage height="420px">
        <LayoutGroup>
          <div class="kb-board">
            <For each={COLS}>
              {col => (
                <section class="kb-col" data-col={col.id} data-testid={`col-${col.id}`}>
                  <motion.h3 class="kb-head" data-testid={`head-${col.id}`} style={{ scale: scales[col.id], background: bgs[col.id] }}>
                    {col.title} ({cols()[col.id].length})
                  </motion.h3>
                  <Reorder.Group
                    axis="y"
                    class="kb-list"
                    values={cols()[col.id]}
                    onReorder={(order: string[]) => {
                      setCols(prev => ({ ...prev, [col.id]: order }))
                      setLastMove(`${col.id}: reordered`)
                    }}
                  >
                    <AnimatePresence>
                      <For each={cols()[col.id]}>
                        {card => (
                          <Reorder.Item
                            value={card}
                            class="kb-card"
                            data-card={card}
                            layoutId={`card-${card}`}
                            drag
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, x: 60 }}
                            whileDrag={{ scale: 1.06, boxShadow: '0 8px 20px rgba(0,0,0,.35)' }}
                            onDragEnd={(event: PointerEvent) => {
                              const to = dropTarget(event.clientX)
                              if (to && to !== col.id) move(card, col.id, to, dropIndex(to, event.clientY))
                            }}
                          >
                            <span>{card}</span>
                            <span class="kb-actions">
                              <button type="button" aria-label={`move ${card} left`} onPointerDown={e => e.stopPropagation()} onClick={() => { const i = COLS.findIndex(c => c.id === col.id); if (i > 0) move(card, col.id, COLS[i - 1].id) }}>&larr;</button>
                              <button type="button" aria-label={`move ${card} right`} onPointerDown={e => e.stopPropagation()} onClick={() => { const i = COLS.findIndex(c => c.id === col.id); if (i < 2) move(card, col.id, COLS[i + 1].id) }}>&rarr;</button>
                              <button type="button" aria-label={`delete ${card}`} onPointerDown={e => e.stopPropagation()} onClick={() => remove(card, col.id)}>&times;</button>
                            </span>
                          </Reorder.Item>
                        )}
                      </For>
                    </AnimatePresence>
                  </Reorder.Group>
                  <Show when={cols()[col.id].length === 0}>
                    <p class="empty">Empty - drop a card here</p>
                  </Show>
                </section>
              )}
            </For>
          </div>
        </LayoutGroup>
      </Stage>
      <style>{`
        .kb-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; }
        .kb-col { min-height: 340px; border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
        .kb-head { margin: 0 0 8px; padding: 6px 10px; border-radius: 8px; font-size: 14px; color: #111; }
        .kb-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
        .kb-card { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: var(--info); color: #fff; padding: 10px 12px; border-radius: 8px; cursor: grab; touch-action: none; user-select: none; }
        .kb-actions { display: flex; gap: 2px; }
        .kb-actions button { background: rgba(255,255,255,.2); color: #fff; border: 0; border-radius: 4px; cursor: pointer; width: 22px; height: 22px; }
      `}</style>
    </>
  )
}
