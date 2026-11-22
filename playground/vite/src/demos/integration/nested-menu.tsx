import { createSignal, For, onSettled, Show } from 'solid-js'
import type { Accessor } from 'solid-js'
import { AnimatePresence, createIsPresent, createPresenceData, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'nested-menu',
  title: 'Nested menu',
  group: 'integration',
  description:
    'Cascading menus: nested AnimatePresence with propagate (closing the root exits every open submenu first), variants orchestration (beforeChildren/afterChildren + stagger), a custom exit direction from AnimatePresence, and a layoutId hover highlight. Keyboard: arrows, Enter/Space, Escape.',
  covers: ['AnimatePresence', 'createIsPresent', 'createPresenceData', 'motion'],
  level: 4,
} as const

interface Item { label: string; children?: Item[] }
const MENU: Item[] = [
  { label: 'File', children: [
    { label: 'New', children: [
      { label: 'Document' }, { label: 'Spreadsheet' },
      { label: 'Presentation', children: [{ label: 'Blank' }, { label: 'From template' }] },
    ] },
    { label: 'Open' }, { label: 'Save' },
  ] },
  { label: 'Edit', children: [{ label: 'Undo' }, { label: 'Redo' }, { label: 'Paste' }] },
  { label: 'View', children: [{ label: 'Zoom in' }, { label: 'Zoom out' }] },
  { label: 'Quit' },
]

type Side = 'right' | 'left'
// `custom` (AnimatePresence custom) is what an exiting level receives in its variant function.
const panel = {
  closed: (side: Side = 'right') => ({
    opacity: 0,
    scale: 0.95,
    x: side === 'right' ? -14 : 14,
    transition: { when: 'afterChildren', staggerChildren: 0.03, staggerDirection: -1, duration: 0.18 },
  }),
  open: { opacity: 1, scale: 1, x: 0, transition: { when: 'beforeChildren', staggerChildren: 0.04, duration: 0.18 } },
} as const
const row = { closed: { opacity: 0, x: -8 }, open: { opacity: 1, x: 0 } }

interface Ctx {
  path: Accessor<string[]>
  active: Accessor<string[]>
  side: Accessor<Side>
  setPath: (path: string[]) => void
  setActive: (path: string[]) => void
  select: (path: string[]) => void
  closeAll: () => void
}

function Level(props: { items: Item[]; depth: number; parent: string[]; ctx: Ctx }) {
  const presenceSide = createPresenceData<Side>()
  return (
    <motion.ul
      class="nm-menu"
      data-side={props.ctx.side()}
      data-exit-custom={presenceSide()}
      role="menu"
      data-depth={props.depth}
      variants={panel}
      initial="closed"
      animate="open"
      exit="closed"
    >
      <For each={props.items}>{item => <Row item={item} depth={props.depth} parent={props.parent} ctx={props.ctx} />}</For>
    </motion.ul>
  )
}

function Row(props: { item: Item; depth: number; parent: string[]; ctx: Ctx }) {
  const { ctx } = props
  const [el, setEl] = createSignal<HTMLElement>()
  const present = createIsPresent(el)
  const here = () => [...props.parent, props.item.label]
  const hasChildren = () => !!props.item.children
  const subOpen = () => hasChildren() && ctx.path()[props.depth] === props.item.label
  const hot = () => ctx.active()[props.depth] === props.item.label && ctx.active().length > props.depth
  const focusLater = (target: () => HTMLElement | null | undefined) => requestAnimationFrame(() => requestAnimationFrame(() => target()?.focus()))
  const openSub = () => {
    ctx.setPath([...ctx.path().slice(0, props.depth), props.item.label])
    focusLater(() => document.querySelector<HTMLElement>(`[data-depth="${props.depth + 1}"] > [role=menuitem]:not([data-present=false])`))
  }
  const closeSub = () => {
    ctx.setPath(ctx.path().slice(0, props.depth))
    focusLater(() => el()?.parentElement?.closest<HTMLElement>('li[role=menuitem]'))
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const stop = () => { event.preventDefault(); event.stopPropagation() }
    const items = () => [...(el()!.parentElement!.children as HTMLCollectionOf<HTMLElement>)].filter(i => i.dataset.present !== 'false')
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      stop()
      const list = items()
      const next = (list.indexOf(el()!) + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
      list[next].focus()
    } else if (event.key === 'ArrowRight' && hasChildren()) { stop(); openSub() }
    else if (event.key === 'ArrowLeft' && props.depth > 0) { stop(); closeSub() }
    else if (event.key === 'Escape') { stop(); props.depth > 0 ? closeSub() : ctx.closeAll() }
    else if (event.key === 'Enter' || event.key === ' ') {
      stop()
      hasChildren() ? openSub() : ctx.select(here())
    }
  }
  return (
    <motion.li
      ref={setEl}
      class="nm-item"
      role="menuitem"
      tabindex={-1}
      variants={row}
      data-label={props.item.label}
      data-depth-of={props.depth}
      data-present={String(present())}
      data-active={hot() ? 'true' : 'false'}
      aria-haspopup={hasChildren() ? 'menu' : undefined}
      onKeyDown={onKeyDown}
      onFocus={() => {
        ctx.setActive(here())
        if (!subOpen()) ctx.setPath(ctx.path().slice(0, props.depth))
      }}
      onPointerEnter={() => {
        ctx.setActive(here())
        ctx.setPath(hasChildren() ? here() : ctx.path().slice(0, props.depth))
      }}
      onClick={() => (hasChildren() ? openSub() : ctx.select(here()))}
    >
      <Show when={hot()}>
        <motion.span class="nm-hl" layoutId={`nm-hl-${props.depth}`} />
      </Show>
      <span class="nm-label">{props.item.label}</span>
      <Show when={hasChildren()}>
        <span class="nm-arrow">&rsaquo;</span>
      </Show>
      <AnimatePresence propagate custom={ctx.side()}>
        <Show when={subOpen()}>
          <Level items={props.item.children ?? []} depth={props.depth + 1} parent={here()} ctx={ctx} />
        </Show>
      </AnimatePresence>
    </motion.li>
  )
}

export default function Demo() {
  const [open, setOpen] = createSignal(false)
  const [path, setPathSignal] = createSignal<string[]>([])
  const [active, setActive] = createSignal<string[]>([])
  const [side, setSide] = createSignal<Side>('right')
  const [selected, setSelected] = createSignal('none')
  const [mounted, setMounted] = createSignal(0)
  let area!: HTMLDivElement
  let trigger!: HTMLButtonElement

  const closeAll = () => {
    setOpen(false)
    setPathSignal([])
    setActive([])
    trigger?.focus()
  }
  const ctx: Ctx = {
    path,
    active,
    side,
    setPath: setPathSignal,
    setActive,
    select: p => { setSelected(p.join(' > ')); closeAll() },
    closeAll,
  }
  const toggle = () => {
    if (open()) return closeAll()
    setOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-depth="0"] > [role=menuitem]')?.focus()))
  }

  onSettled(() => {
    const count = () => setMounted(area.querySelectorAll('[role=menu]').length)
    const observer = new MutationObserver(count)
    observer.observe(area, { childList: true, subtree: true })
    count()
    return () => observer.disconnect()
  })

  return (
    <>
      <Controls>
        <button type="button" class="btn" ref={trigger} aria-expanded={open() ? "true" : "false"} onClick={toggle} data-testid="trigger">
          {open() ? 'Close menu' : 'Open menu'}
        </button>
        <Button pressed={side() === 'left'} onClick={() => setSide(s => (s === 'right' ? 'left' : 'right'))}>
          Submenus open to the {side()}
        </Button>
        <Readout label="open" value={String(open())} />
        <Readout label="open path" value={path().join(' > ') || '-'} />
        <Readout label="highlight" value={active().join(' > ') || '-'} />
        <Readout label="menus in DOM" value={mounted()} />
        <Readout label="selected" value={selected()} />
      </Controls>
      <Stage height="340px">
        <div class="nm-area" ref={area} data-testid="area">
          <AnimatePresence propagate custom={side()}>
            <Show when={open()}>
              <div class="nm-root" data-testid="root">
                <Level items={MENU} depth={0} parent={[]} ctx={ctx} />
              </div>
            </Show>
          </AnimatePresence>
        </div>
      </Stage>
      <style>{`
        .nm-area { position: relative; width: 100%; min-height: 300px; }
        .nm-root { position: relative; width: 200px; }
        .nm-menu { list-style: none; margin: 0; padding: 4px; min-width: 180px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 10px 28px rgba(0,0,0,.3); position: relative; z-index: 1; }
        .nm-menu .nm-menu { position: absolute; top: -5px; z-index: 2; }
        .nm-menu[data-side=right] .nm-menu { left: calc(100% + 4px); }
        .nm-menu[data-side=left] .nm-menu { right: calc(100% + 4px); }
        .nm-item { position: relative; display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; border-radius: 5px; cursor: pointer; outline: none; font-size: 14px; }
        .nm-item:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
        .nm-hl { position: absolute; inset: 0; background: color-mix(in srgb, var(--accent) 28%, transparent); border-radius: 5px; }
        .nm-label, .nm-arrow { position: relative; }
      `}</style>
    </>
  )
}
