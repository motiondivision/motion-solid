import { createSignal, Show } from 'solid-js'
import { AnimatePresence, createIsPresent, createPresence, createPresenceData, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-presence-primitives',
  title: 'Presence primitives in a non-motion component',
  group: 'reference',
  description: 'Plain divs hold their own removal with createPresence (onExit promise, and safeToRemove), createIsPresent reads presence without holding, createPresenceData reads AnimatePresence custom.',
  covers: ['AnimatePresence', 'createIsPresent', 'createPresence', 'createPresenceData', 'motion'],
} as const

const card = { padding: '10px 14px', color: '#fff', 'border-radius': '8px', width: '320px', transition: 'opacity 0.6s, transform 0.6s' } as const

// A leaving subtree is disposed before its exit runs, so reactive bindings in it stop
// updating. The exit is therefore written to the element directly.

/** Exit via `onExit`: removal waits for the returned promise (a CSS transition here). */
function ToastOnExit(props: { onEnded: () => void }) {
  let el!: HTMLDivElement
  const custom = createPresenceData<string>()
  createPresence({
    element: () => el,
    onExit: () => new Promise<void>((resolve) => {
      el.dataset.present = 'false'
      el.textContent = 'onExit running (isPresent false)'
      el.style.opacity = '0'
      el.style.transform = 'translateY(-20px)'
      el.addEventListener('transitionend', () => { props.onEnded(); resolve() }, { once: true })
    }),
  })
  return <div ref={el} data-testid="toast-onexit" data-present="true" style={{ ...card, background: '#0f766e' }}>createPresence + onExit. custom={String(custom())}</div>
}

/** Exit via `safeToRemove()`: removal is held until it is called (here, 1.2s after the exit starts). */
function ToastSafe() {
  let el!: HTMLDivElement
  const [isPresent, safeToRemove] = createPresence({ element: () => el })
  const watch = setInterval(() => {
    if (!el.isConnected) return clearInterval(watch)
    if (isPresent()) return
    clearInterval(watch)
    el.dataset.present = 'false'
    el.textContent = 'holding removal... safeToRemove() in 1.2s'
    setTimeout(safeToRemove, 1200)
  }, 30)
  return <div ref={el} data-testid="toast-safe" data-present="true" style={{ ...card, background: '#1d4ed8' }}>createPresence + safeToRemove()</div>
}

/** createIsPresent flips but never holds removal. */
function Watcher() {
  let el!: HTMLDivElement
  const present = createIsPresent(() => el)
  const watch = setInterval(() => {
    if (!el.isConnected) return clearInterval(watch)
    if (present()) return
    clearInterval(watch)
    el.dataset.present = 'false'
    el.textContent = 'createIsPresent: false'
  }, 30)
  return <div ref={el} data-testid="watcher" data-present="true" style={{ padding: '6px' }}>createIsPresent: true</div>
}

export default function Demo() {
  const [show, setShow] = createSignal(true)
  const [custom, setCustom] = createSignal('first')
  const [ended, setEnded] = createSignal(0)
  return (
    <>
      <Controls>
        <Button onClick={() => setShow(v => !v)}>{show() ? 'Remove' : 'Add'}</Button>
        <Button onClick={() => setCustom(c => (c === 'first' ? 'second' : 'first'))}>custom: {custom()}</Button>
        <Readout label="onExit transitions ended" value={ended()} />
      </Controls>
      <Stage height="260px">
        <AnimatePresence custom={custom()}>
          <Show when={show()}>
            <div style={{ display: 'grid', gap: '10px' }}>
              <ToastOnExit onEnded={() => setEnded(n => n + 1)} />
              <ToastSafe />
              <Watcher />
              <motion.div class="box" exit={{ opacity: 0, transition: { duration: 0.3 } }} />
            </div>
          </Show>
        </AnimatePresence>
      </Stage>
    </>
  )
}
