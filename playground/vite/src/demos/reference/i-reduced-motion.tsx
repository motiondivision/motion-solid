import { createSignal, Show } from 'solid-js'
import { createReducedMotion, createReducedMotionConfig, MotionConfig, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-reduced-motion',
  title: 'Reduced motion primitives',
  group: 'reference',
  description: 'createReducedMotion (OS preference) and createReducedMotionConfig (resolved through MotionConfig reducedMotion); transform animations are skipped when reduced.',
  covers: ['MotionConfig', 'createReducedMotion', 'createReducedMotionConfig', 'motion'],
  expects: ['Reduced Motion enabled'],
} as const

type Mode = 'user' | 'always' | 'never'

function Inner() {
  const resolved = createReducedMotionConfig()
  const [on, setOn] = createSignal(false)
  return (
    <>
      <Controls>
        <Readout label="createReducedMotionConfig()" value={String(resolved())} ok={undefined} />
        <Button onClick={() => setOn(v => !v)}>Animate x + opacity</Button>
      </Controls>
      <Stage height="140px">
        <motion.div class="box" data-testid="rm-box" animate={{ x: on() ? 300 : 0, opacity: on() ? 0.4 : 1 }} transition={{ duration: 1 }} />
      </Stage>
    </>
  )
}

export default function Demo() {
  const os = createReducedMotion()
  const [mode, setMode] = createSignal<Mode>('user')
  return (
    <>
      <Controls>
        <Readout label="createReducedMotion() (OS)" value={String(os())} />
        <Button onClick={() => setMode(m => (m === 'user' ? 'always' : m === 'always' ? 'never' : 'user'))}>MotionConfig reducedMotion: {mode()}</Button>
        <span>Emulate the OS setting with DevTools Rendering panel to see "user" follow it.</span>
      </Controls>
      <Show when={mode()} keyed>
        {m => (
          <MotionConfig reducedMotion={m}>
            <Inner />
          </MotionConfig>
        )}
      </Show>
    </>
  )
}
