import { createMemo, createSignal, For, onSettled, Show } from 'solid-js'
import { AnimatePresence, createAnimate, LayoutGroup, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'command-palette',
  title: 'Command palette',
  group: 'integration',
  description:
    'Ctrl/Cmd+K (or the button) opens a modal. Type to filter; ArrowUp/Down moves the active row (layoutId highlight), Enter runs it and flashes the result bar via createAnimate, Escape closes.',
  covers: ['AnimatePresence', 'LayoutGroup', 'createAnimate', 'motion'],
  level: 3,
} as const

const COMMANDS = [
  'New file', 'New folder', 'Open recent', 'Save all', 'Close editor', 'Toggle sidebar',
  'Toggle terminal', 'Format document', 'Go to line', 'Find in files',
]

const list = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const row = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24, transition: { duration: 0.15 } },
}

export default function Demo() {
  const [open, setOpen] = createSignal(false)
  const [query, setQuery] = createSignal('')
  const [index, setIndex] = createSignal(0)
  const [runs, setRuns] = createSignal(0)
  const [last, setLast] = createSignal('none')
  const [scope, animate] = createAnimate<HTMLDivElement>()

  const results = createMemo(() => COMMANDS.filter(c => c.toLowerCase().includes(query().toLowerCase().trim())))
  const active = createMemo(() => Math.max(0, Math.min(index(), results().length - 1)))

  const close = () => { setOpen(false); setQuery(''); setIndex(0) }
  const run = () => {
    const command = results()[active()]
    if (!command) return
    setLast(command)
    setRuns(n => n + 1)
    close()
    animate('[data-flash]', { backgroundColor: ['#22c55e', 'rgba(34,197,94,0)'], scale: [1.04, 1] }, { duration: 0.7 })
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex(active() + 1 >= results().length ? 0 : active() + 1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex(active() - 1 < 0 ? results().length - 1 : active() - 1) }
    else if (event.key === 'Enter') { event.preventDefault(); run() }
    else if (event.key === 'Escape') close()
  }

  onSettled(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(value => !value)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <>
      <Controls>
        <Button onClick={() => setOpen(true)}>Open palette</Button>
        <Readout label="open" value={String(open())} />
        <Readout label="query" value={JSON.stringify(query())} />
        <Readout label="matches" value={results().length} />
        <Readout label="active" value={results()[active()] ?? '-'} />
        <Readout label="runs" value={runs()} />
      </Controls>
      <Stage height="440px">
        <div ref={scope}>
          <div class="cp-result" data-flash data-testid="result">
            Last command: <b>{last()}</b>
          </div>
        </div>
        <AnimatePresence mode="popLayout">
          <Show when={open()}>
            <motion.div
              class="cp-overlay"
              data-testid="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
            >
              <motion.div
                class="cp-modal"
                data-testid="modal"
                role="dialog"
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.96 }}
                onClick={(event: MouseEvent) => event.stopPropagation()}
              >
                <motion.input
                  class="cp-input"
                  data-testid="input"
                  placeholder="Type a command..."
                  value={query()}
                  ref={(el: HTMLInputElement) => requestAnimationFrame(() => el.focus())}
                  whileFocus={{ boxShadow: '0 0 0 3px #7c3aed' }}
                  onInput={(event: InputEvent) => { setQuery((event.currentTarget as HTMLInputElement).value); setIndex(0) }}
                  onKeyDown={onKey}
                />
                <LayoutGroup>
                  <motion.ul class="cp-list" variants={list} initial="hidden" animate="show">
                    <AnimatePresence mode="popLayout">
                      <For each={results()}>
                        {command => (
                          <motion.li
                            layout="position"
                            variants={row}
                            class="cp-row"
                            data-row={command}
                            data-active={results()[active()] === command ? 'true' : 'false'}
                            onClick={() => { setIndex(results().indexOf(command)); run() }}
                          >
                            <Show when={results()[active()] === command}>
                              <motion.span class="cp-hl" layoutId="cp-hl" />
                            </Show>
                            <span class="cp-label">{command}</span>
                          </motion.li>
                        )}
                      </For>
                    </AnimatePresence>
                  </motion.ul>
                </LayoutGroup>
                <Show when={results().length === 0}>
                  <p class="empty">No matching command</p>
                </Show>
              </motion.div>
            </motion.div>
          </Show>
        </AnimatePresence>
      </Stage>
      <style>{`
        .cp-result { padding: 12px 16px; border: 1px solid var(--border); border-radius: 8px; }
        .cp-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.45); display: flex; justify-content: center; align-items: flex-start; padding-top: 24px; z-index: 5; }
        .cp-modal { width: 380px; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 12px; box-shadow: 0 20px 50px rgba(0,0,0,.4); }
        .cp-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: inherit; font: inherit; outline: none; }
        .cp-list { list-style: none; margin: 8px 0 0; padding: 0; max-height: 300px; overflow: hidden; }
        .cp-row { position: relative; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
        .cp-label { position: relative; }
        .cp-hl { position: absolute; inset: 0; background: color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 6px; }
      `}</style>
    </>
  )
}
