import { createSignal } from 'solid-js'
import { createDragControls, DragControls, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-drag-controls',
  title: 'Interaction: dragListener=false + drag controls',
  group: 'reference',
  description: 'createDragControls start from a separate handle, snapToCursor on a track, cancel/stop, and a DragControls instance check.',
  covers: ['createDragControls', 'DragControls', 'motion'],
} as const

export default function Demo() {
  const controls = createDragControls()
  const [snap, setSnap] = createSignal(false)
  const [dragging, setDragging] = createSignal(false)

  return (
    <>
      <Controls>
        <Readout label="instanceof DragControls" value={String(controls instanceof DragControls)} ok={controls instanceof DragControls} />
        <Readout label="dragging" value={String(dragging())} />
        <Button pressed={snap()} onClick={() => setSnap(v => !v)}>snapToCursor: {String(snap())}</Button>
        <Button onClick={() => controls.cancel()}>cancel()</Button>
        <Button onClick={() => controls.stop()}>stop()</Button>
      </Controls>
      <Stage height="240px">
        <div
          data-testid="track"
          style={{ position: 'relative', width: '420px', height: '90px', background: 'var(--border)', 'border-radius': '10px' }}
          onPointerDown={event => controls.start(event, { snapToCursor: snap() })}
        >
          <motion.div
            class="box"
            data-testid="ctl-box"
            style={{ width: '70px', height: '70px', position: 'absolute', top: '10px', left: '0', touchAction: 'none' }}
            drag="x"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ left: 0, right: 350 }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
          />
        </div>
        <p>The box ignores direct pointer-downs (dragListener=false). Press anywhere on the track to start the drag.</p>
      </Stage>
    </>
  )
}
