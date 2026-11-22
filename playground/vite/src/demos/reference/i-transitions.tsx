import { createSignal } from 'solid-js'
import { createMotionValue, createMotionValueEvent, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-transitions',
  title: 'Transitions: spring, tween, keyframes, inertia, repeat',
  group: 'reference',
  description: 'One row per transition type: spring options, tween ease, keyframes with times and ease arrays, repeat/repeatType/delay, per-value overrides and inertia via drag release.',
  covers: ['createMotionValue', 'createMotionValueEvent', 'motion'],
} as const

const track = { position: 'relative', width: '100%', height: '44px', background: 'var(--border)', 'border-radius': '8px' } as const
const dot = { position: 'absolute', top: '4px', left: '0', width: '36px', height: '36px', 'border-radius': '50%', background: 'var(--box)' } as const

export default function Demo() {
  const [go, setGo] = createSignal(false)
  const [rate, setRate] = createSignal(0)
  const x = createMotionValue(0)
  createMotionValueEvent(x, 'change', v => setRate(Math.round(v)))
  const X = 380

  return (
    <>
      <Controls>
        <Button onClick={() => setGo(v => !v)}>Toggle (go = {String(go())})</Button>
        <Button onClick={() => x.jump(0)}>Reset inertia dot</Button>
        <Readout label="inertia dot x" value={rate()} />
      </Controls>
      <Stage height="420px" class="transitions">
        <div style={{ width: '100%', display: 'grid', gap: '8px' }}>
          <div style={track}><motion.div data-testid="t-spring" style={dot} animate={{ x: go() ? X : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 8, mass: 1 }} /></div>
          <div style={track}><motion.div data-testid="t-tween" style={dot} animate={{ x: go() ? X : 0 }} transition={{ type: 'tween', duration: 0.8, ease: 'easeInOut' }} /></div>
          <div style={track}><motion.div data-testid="t-bezier" style={dot} animate={{ x: go() ? X : 0 }} transition={{ duration: 0.8, ease: [0.8, 0, 0.2, 1] }} /></div>
          <div style={track}>
            <motion.div
              data-testid="t-keyframes"
              style={dot}
              animate={{ x: go() ? [0, 100, 60, X] : [X, 60, 100, 0], scale: go() ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 1.2, times: [0, 0.3, 0.6, 1], ease: ['easeOut', 'easeIn', 'linear'] }}
            />
          </div>
          <div style={track}>
            <motion.div
              data-testid="t-repeat"
              style={dot}
              animate={{ x: go() ? X : 0 }}
              transition={{ duration: 0.5, delay: 0.2, repeat: 3, repeatType: 'reverse', repeatDelay: 0.1 }}
            />
          </div>
          <div style={track}>
            <motion.div
              data-testid="t-per-value"
              style={dot}
              animate={{ x: go() ? X : 0, backgroundColor: go() ? '#22c55e' : '#6366f1', rotate: go() ? 360 : 0 }}
              transition={{
                x: { type: 'spring', stiffness: 80 },
                backgroundColor: { duration: 0.2 },
                rotate: { duration: 1.5, ease: 'linear' },
              }}
            />
          </div>
          <div style={track}>
            <motion.div
              data-testid="t-inertia"
              style={{ ...dot, x, cursor: 'grab' }}
              drag="x"
              dragConstraints={{ left: 0, right: X }}
              dragTransition={{ power: 0.5, timeConstant: 300, bounceStiffness: 500, bounceDamping: 25 }}
            />
          </div>
        </div>
        <p>Rows: spring, tween, cubic-bezier, keyframes+times+ease[], repeat+delay, per-value overrides, inertia (drag and fling the last dot).</p>
      </Stage>
    </>
  )
}
