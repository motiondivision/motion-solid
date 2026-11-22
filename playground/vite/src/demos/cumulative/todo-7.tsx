import { createMemo, createSignal, For, Show } from 'solid-js'
import {
  AnimatePresence,
  createDragControls,
  createMotionValueEvent,
  createSpring,
  createTransform,
  motion,
  Reorder,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'todo-7',
  title: 'Todo 7: motion values',
  group: 'cumulative',
  description:
    'Stage 7: todo 6 plus motion values. A createSpring follows the completed fraction; createTransform maps it to the bar width (percent string) and the ring length, and createMotionValueEvent writes the spring value to the percent readout on every change, so the number counts up with the bar. Test: complete items one by one, Add 20 (the bar eases back), Clear, and check the percent readout settles on done/total.',
  covers: ['AnimatePresence', 'Reorder', 'createDragControls', 'createMotionValueEvent', 'createSpring', 'createTransform', 'motion'],
  level: 7,
} as const

type Filter = 'all' | 'active' | 'done'
type Todo = { id: number; text: string; done: () => boolean; toggle: () => void }

const css = `
.td { width: 380px; max-width: 100%; }
.td-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; position: relative; }
.td-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
.td-item[data-done=true] .td-text { text-decoration: line-through; color: var(--muted); }
.td-item { display: flex; align-items: center; gap: 6px; }
.td-row { flex: 1; cursor: grab; user-select: none; touch-action: pan-y; }
.td-grip { cursor: grab; color: var(--muted); font-size: 18px; touch-action: none; user-select: none; padding: 4px; }
.td-text { flex: 1; }
.td-del { background: none; border: 0; color: var(--bad); font-size: 18px; cursor: pointer; line-height: 1; }
.td-progress { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.td-track { flex: 1; height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; }
.td-bar { height: 100%; background: var(--accent, #6366f1); }
.td-empty { color: var(--muted); font-size: 13px; padding: 8px 0; }
`

export default function Demo() {
  let seq = 0
  const make = (text: string): Todo => {
    const [done, setDone] = createSignal(false)
    return { id: ++seq, text, done, toggle: () => setDone(value => !value) }
  }

  const [todos, setTodos] = createSignal<Todo[]>([make('Buy milk'), make('Write demo'), make('Ship it')])
  const [filter, setFilter] = createSignal<Filter>('all')
  const [text, setText] = createSignal('')
  const [swiped, setSwiped] = createSignal(0)

  const visible = createMemo(() =>
    todos().filter(todo => filter() === 'all' || (filter() === 'done') === todo.done()),
  )
  const doneCount = createMemo(() => todos().filter(todo => todo.done()).length)

  // Completed fraction -> spring -> bar width / ring length; the same spring feeds the percent readout.
  const fraction = createSpring(() => (todos().length === 0 ? 0 : doneCount() / todos().length), { stiffness: 140, damping: 22 })
  const barWidth = createTransform(fraction, [0, 1], ['0%', '100%'])
  const [percent, setPercent] = createSignal(0)
  createMotionValueEvent(fraction, 'change', latest => setPercent(Math.round(latest * 100)))

  const add = () => {
    const value = text().trim()
    setTodos(list => [...list, make(value || `Task ${seq + 1}`)])
    setText('')
  }
  const addMany = () => setTodos(list => [...list, ...Array.from({ length: 20 }, () => make(`Task ${seq + 1}`))])
  // The group reports the new order of the visible rows only; put them back into the full list.
  const reorder = (next: Todo[]) =>
    setTodos(list => {
      const shown = new Set(next)
      let index = 0
      return list.map(todo => (shown.has(todo) ? next[index++] : todo))
    })
  const remove = (id: number) => setTodos(list => list.filter(todo => todo.id !== id))

  return (
    <>
      <style>{css}</style>
      <Controls>
        <form
          style={{ display: 'flex', gap: '8px' }}
          onSubmit={event => {
            event.preventDefault()
            add()
          }}
        >
          <input
            data-testid="new-text"
            placeholder="New todo (empty = Task N)"
            value={text()}
            onInput={event => setText(event.currentTarget.value)}
          />
          <button type="submit" class="btn" data-testid="add">Add item</button>
        </form>
        <Button onClick={addMany}>Add 20</Button>
        <Button onClick={() => setTodos([])}>Clear</Button>
      </Controls>
      <Controls>
        <For each={['all', 'active', 'done'] as Filter[]}>
          {name => (
            <Button pressed={filter() === name} onClick={() => setFilter(name)}>{name}</Button>
          )}
        </For>
        <Readout label="total" value={todos().length} />
        <Readout label="done" value={doneCount()} />
        <Readout label="shown" value={visible().length} />
        <Readout label="progress %" value={percent()} />
        <Readout label="swipe-deleted" value={swiped()} />
        <Readout label="order" value={visible().map(todo => todo.id).join(',')} />
      </Controls>
      <Stage height="320px">
        <div class="td">
          <div class="td-progress" data-testid="progress">
            <svg class="td-ring" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" stroke-width="4" />
              <motion.circle
                data-testid="ring"
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="var(--accent, #6366f1)"
                stroke-width="4"
                stroke-linecap="round"
                transform="rotate(-90 18 18)"
                style={{ pathLength: fraction }}
              />
            </svg>
            <div class="td-track">
              <motion.div class="td-bar" data-testid="bar" style={{ width: barWidth }} />
            </div>
          </div>
          <Reorder.Group as="ul" class="td-list" data-testid="list" axis="y" values={visible()} onReorder={reorder}>
            <AnimatePresence mode="popLayout">
            <For each={visible()}>
              {todo => {
                const controls = createDragControls()
                return (
                <Reorder.Item
                  value={todo}
                  class="td-item"
                  dragListener={false}
                  dragControls={controls}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                  data-testid="todo" data-id={todo.id} data-done={String(todo.done())}>
                  <span class="td-grip" data-testid="grip" title="Drag to reorder" onPointerDown={event => controls.start(event)}>⠿</span>
                  <motion.div
                    class="td-row"
                    data-testid="swipe"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.7, right: 0.1 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -100 || info.velocity.x < -600) {
                        setSwiped(count => count + 1)
                        remove(todo.id)
                      }
                    }}
                  >
                    <input type="checkbox" checked={todo.done()} aria-label="Complete" onChange={() => todo.toggle()} />
                    <span class="td-text">{todo.text}</span>
                    <button type="button" class="td-del" aria-label="Delete" onClick={() => remove(todo.id)}>×</button>
                  </motion.div>
                </Reorder.Item>
                )
              }}
            </For>
            </AnimatePresence>
          </Reorder.Group>
          <Show when={visible().length === 0}>
            <div class="td-empty">Nothing to show</div>
          </Show>
        </div>
      </Stage>
    </>
  )
}
