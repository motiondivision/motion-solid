import { createMemo, createSignal, For, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'todo-3',
  title: 'Todo 3: exit with AnimatePresence',
  group: 'cumulative',
  description:
    'Stage 3: todo 2 plus an exit animation. The <For> is wrapped in AnimatePresence and each row has exit (fades and slides left), so deleted, cleared and filtered-out rows animate away before leaving the DOM. Test: delete a row, Clear with many rows, switch filters while rows are still exiting, and toggle complete under the done filter.',
  covers: ['AnimatePresence', 'motion'],
  level: 3,
} as const

type Filter = 'all' | 'active' | 'done'
type Todo = { id: number; text: string; done: () => boolean; toggle: () => void }

const css = `
.td { width: 380px; max-width: 100%; }
.td-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; position: relative; }
.td-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
.td-row[data-done=true] .td-text { text-decoration: line-through; color: var(--muted); }
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
        <Readout label="order" value={visible().map(todo => todo.id).join(',')} />
      </Controls>
      <Stage height="320px">
        <div class="td">
          <ul class="td-list" data-testid="list">
            <AnimatePresence>
            <For each={visible()}>
              {todo => (
                <motion.li
                  class="td-row"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                  data-testid="todo" data-id={todo.id} data-done={String(todo.done())}>
                  <input type="checkbox" checked={todo.done()} aria-label="Complete" onChange={() => todo.toggle()} />
                  <span class="td-text">{todo.text}</span>
                  <button type="button" class="td-del" aria-label="Delete" onClick={() => remove(todo.id)}>×</button>
                </motion.li>
              )}
            </For>
            </AnimatePresence>
          </ul>
          <Show when={visible().length === 0}>
            <div class="td-empty">Nothing to show</div>
          </Show>
        </div>
      </Stage>
    </>
  )
}
