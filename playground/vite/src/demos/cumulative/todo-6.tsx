import { createMemo, createSignal, For, Show } from 'solid-js'
import { AnimatePresence, createDragControls, motion, Reorder } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'todo-6',
  title: 'Todo 6: gestures',
  group: 'cumulative',
  description:
    'Stage 6: todo 5 plus gestures. Rows scale on hover (whileHover) and press (whileTap), and swipe left to delete (drag=x, onDragEnd deletes past 100px or a fast flick, otherwise it springs back). Reorder moves to a grip handle (createDragControls, dragListener=false) so the two drags do not fight. Test: hover and press a row, drag it halfway and release (snaps back), swipe it far left (deleted), drag the grip to reorder.',
  covers: ['AnimatePresence', 'Reorder', 'createDragControls', 'motion'],
  level: 6,
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
        <Readout label="swipe-deleted" value={swiped()} />
        <Readout label="order" value={visible().map(todo => todo.id).join(',')} />
      </Controls>
      <Stage height="320px">
        <div class="td">
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
