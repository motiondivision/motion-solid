import { createSignal, For } from 'solid-js'
import {
  createMotionTemplate,
  createMotionValue,
  createSpring,
  createTime,
  createTransform,
  createVelocity,
  motion,
  RowValue,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'cursor-playground',
  title: 'Cursor playground',
  group: 'integration',
  description:
    'A spring-smoothed pointer follower that skews with velocity, a time-hued gradient spotlight, orbiting dots driven by createTime, and magnetic whileHover buttons. Sliders change spring stiffness and orbit speed live.',
  covers: [
    'createMotionTemplate',
    'createMotionValue',
    'createSpring',
    'createTime',
    'createTransform',
    'createVelocity',
    'motion',
    'RowValue',
  ],
  level: 3,
} as const

const PHASES = [0, 1.26, 2.51, 3.77, 5.03]
const MAGNETS = ['Alpha', 'Beta', 'Gamma']

function Magnet(props: { label: string }) {
  const mx = createMotionValue(0)
  const my = createMotionValue(0)
  const x = createSpring(mx, { stiffness: 300, damping: 15 })
  const y = createSpring(my, { stiffness: 300, damping: 15 })
  const pull = (event: PointerEvent) => {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
    mx.set((event.clientX - (r.left + r.width / 2)) * 0.4)
    my.set((event.clientY - (r.top + r.height / 2)) * 0.4)
  }
  return (
    <motion.button
      type="button"
      class="btn cp2-magnet"
      data-testid={`magnet-${props.label}`}
      style={{ x, y }}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onPointerMove={pull}
      onPointerLeave={() => { mx.set(0); my.set(0) }}
    >
      {props.label}
    </motion.button>
  )
}

export default function Demo() {
  const [stiffness, setStiffness] = createSignal(200)
  const [orbit, setOrbit] = createSignal(1)
  const mx = createMotionValue(300)
  const my = createMotionValue(160)
  const sx = createSpring(mx, () => ({ stiffness: stiffness(), damping: 20 }))
  const sy = createSpring(my, () => ({ stiffness: stiffness(), damping: 20 }))
  const vx = createVelocity(sx)
  const skew = createTransform(vx, [-2000, 0, 2000], [-35, 0, 35])
  const stretch = createTransform(vx, v => 1 + Math.min(Math.abs(v) / 3000, 0.6))
  const time = createTime()
  const hue = createTransform(time, t => Math.round((t / 20) % 360))
  const spotlight = createMotionTemplate`radial-gradient(circle at ${sx}px ${sy}px, hsl(${hue} 90% 60% / 0.55), transparent 240px)`
  const left = createTransform(sx, v => v - 20)
  const top = createTransform(sy, v => v - 20)
  const lag = createTransform([mx, sx, my, sy], ([a, b, c, d]: number[]) => Math.round(Math.hypot(a - b, c - d)))
  const rx = createTransform(mx, Math.round)
  const ry = createTransform(my, Math.round)
  const skewR = createTransform(skew, v => v.toFixed(1))
  const dots = PHASES.map(phase => ({
    x: createTransform([time, sx], ([t, x]: number[]) => x + 60 * Math.cos((t / 400) * orbit() + phase) - 6),
    y: createTransform([time, sy], ([t, y]: number[]) => y + 60 * Math.sin((t / 400) * orbit() + phase) - 6),
  }))

  const track = (event: PointerEvent) => {
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect()
    mx.set(event.clientX - r.left)
    my.set(event.clientY - r.top)
  }
  const jump = (x: number, y: number) => { mx.set(x); my.set(y) }

  return (
    <>
      <Controls>
        <Button onClick={() => jump(40, 40)}>Jump top-left</Button>
        <Button onClick={() => jump(560, 40)}>Jump top-right</Button>
        <Button onClick={() => jump(300, 300)}>Jump bottom</Button>
        <label>
          spring stiffness {stiffness()}
          <input type="range" min="20" max="800" value={stiffness()} onInput={e => setStiffness(+e.currentTarget.value)} />
        </label>
        <label>
          orbit speed {orbit().toFixed(1)}
          <input type="range" min="0" max="5" step="0.1" value={orbit()} onInput={e => setOrbit(+e.currentTarget.value)} />
        </label>
      </Controls>
      <Controls>
        <Readout label="pointer x" value={<RowValue value={rx} />} />
        <Readout label="pointer y" value={<RowValue value={ry} />} />
        <Readout label="follower lag px" value={<RowValue value={lag} />} />
        <Readout label="skewX deg" value={<RowValue value={skewR} />} />
        <Readout label="hue" value={<RowValue value={hue} />} />
      </Controls>
      <Stage height="380px">
        <div class="cp2-area" data-testid="area" onPointerMove={track}>
          <motion.div class="cp2-spot" data-testid="spot" style={{ background: spotlight }} />
          <For each={dots}>
            {(dot, i) => <motion.div class="cp2-dot" data-testid={`dot-${i()}`} style={{ x: dot.x, y: dot.y }} />}
          </For>
          <motion.div class="cp2-follower" data-testid="follower" style={{ x: left, y: top, skewX: skew, scaleX: stretch }} />
          <div class="cp2-magnets">
            <For each={MAGNETS}>{label => <Magnet label={label} />}</For>
          </div>
        </div>
      </Stage>
      <style>{`
        .cp2-area { position: relative; width: 100%; height: 340px; overflow: hidden; border-radius: 8px; cursor: none; }
        .cp2-spot { position: absolute; inset: 0; pointer-events: none; }
        .cp2-follower { position: absolute; left: 0; top: 0; width: 40px; height: 40px; border-radius: 50%; background: #fff; mix-blend-mode: difference; pointer-events: none; }
        .cp2-dot { position: absolute; left: 0; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); pointer-events: none; }
        .cp2-magnets { position: absolute; left: 0; right: 0; bottom: 24px; display: flex; justify-content: center; gap: 48px; }
        .cp2-magnet { cursor: none; }
      `}</style>
    </>
  )
}
