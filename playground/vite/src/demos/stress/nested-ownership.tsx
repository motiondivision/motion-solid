import { createSignal, For, onSettled, Show } from 'solid-js'
import { motion } from 'motion-solid'
import type { Variants } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'nested-ownership',
  title: 'Nested ownership (variant trees under Show / For)',
  group: 'stress',
  description:
    'Deep trees of motion elements that inherit variants (no animate props on descendants), mounted under For and Show from changing data. Every node must run its mount animation and every owner must be disposed on removal.',
  covers: ['motion'],
} as const

const variants: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (depth: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, delayChildren: 0.02, staggerChildren: 0.02, delay: depth * 0.01 },
  }),
}

const stats = { created: 0, disposed: 0, completed: 0 }

function Node(props: { depth: number; maxDepth: number; branch: number }) {
  onSettled(() => {
    stats.created++
    return () => {
      stats.disposed++
    }
  })
  // Root sets initial/animate; every descendant inherits the labels from context.
  const root = () => props.depth === 0
  return (
    <motion.div
      class="own-node"
      data-node=""
      data-depth={props.depth}
      variants={variants as never}
      custom={props.depth}
      initial={root() ? 'hidden' : undefined}
      animate={root() ? 'visible' : undefined}
      onAnimationComplete={() => {
        stats.completed++
      }}
    >
      <Show when={props.depth < props.maxDepth}>
        <For each={Array.from({ length: props.branch }, (_, i) => i)}>
          {() => <Node depth={props.depth + 1} maxDepth={props.maxDepth} branch={props.branch} />}
        </For>
      </Show>
    </motion.div>
  )
}

const count = (depth: number, branch: number) => {
  let total = 0
  for (let d = 0; d <= depth; d++) total += branch ** d
  return total
}

export default function Demo() {
  const [trees, setTrees] = createSignal<number[]>([1])
  const [depth, setDepth] = createSignal(3)
  const [branch, setBranch] = createSignal(3)
  const [open, setOpen] = createSignal(true)
  const [view, setView] = createSignal({ created: 0, disposed: 0, completed: 0, dom: 0, visible: 0 })
  let nextId = 2

  onSettled(() => {
    const id = setInterval(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-node]'))
      setView({
        ...stats,
        dom: nodes.length,
        visible: nodes.filter(n => Number(getComputedStyle(n).opacity) > 0.999).length,
      })
    }, 120)
    return () => clearInterval(id)
  })

  const live = () => view().created - view().disposed
  const expected = () => (open() ? trees().length * count(depth(), branch()) : 0)
  const consistent = () => live() === view().dom
  const settled = () => view().visible === view().dom
  const allExpected = () => view().dom === expected()

  return (
    <>
      <Controls>
        <Button onClick={() => setTrees(list => [...list, nextId++])}>Add tree</Button>
        <Button onClick={() => setTrees(list => list.slice(0, -1))}>Remove last tree</Button>
        <Button onClick={() => setTrees(list => list.slice(1))}>Remove first tree</Button>
        <Button onClick={() => setTrees(list => list.map(() => nextId++))}>Replace all trees</Button>
        <Button pressed={open()} onClick={() => setOpen(value => !value)}>
          Show {open() ? 'ON' : 'OFF'}
        </Button>
        <label>
          depth {depth()}
          <input type="range" min="1" max="5" value={depth()} onInput={e => setDepth(+e.currentTarget.value)} />
        </label>
        <label>
          branch {branch()}
          <input type="range" min="1" max="4" value={branch()} onInput={e => setBranch(+e.currentTarget.value)} />
        </label>
      </Controls>
      <Controls>
        <Readout label="trees" value={trees().length} />
        <Readout label="expected nodes" value={expected()} />
        <Readout label="DOM nodes" value={view().dom} />
        <Readout label="created / disposed" value={`${view().created} / ${view().disposed}`} />
        <Readout label="mount animations complete" value={view().completed} />
        <Readout label="fully visible" value={view().visible} />
      </Controls>
      <Controls>
        <Readout label="DOM == expected" value={allExpected() ? 'PASS' : 'FAIL'} ok={allExpected()} />
        <Readout label="live owners == DOM" value={consistent() ? 'PASS' : 'FAIL'} ok={consistent()} />
        <Readout label="all DOM nodes reached visible" value={settled() ? 'PASS' : 'animating / FAIL'} ok={settled() ? true : undefined} />
        <Readout label="completions >= created" value={view().completed >= view().created ? 'PASS' : 'animating / FAIL'} ok={view().completed >= view().created ? true : undefined} />
      </Controls>
      <Stage height="300px">
        <Show when={open()}>
          <For each={trees()}>{id => <Node depth={0} maxDepth={depth()} branch={branch()} data-tree={id} />}</For>
        </Show>
        <style>{`.own-node{display:flex;flex-wrap:wrap;gap:3px;padding:3px;border:1px solid hsl(210 50% 60% / .6);border-radius:4px;background:hsl(210 60% 60% / .12);min-width:8px;min-height:8px}`}</style>
      </Stage>
    </>
  )
}
