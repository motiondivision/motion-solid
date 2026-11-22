import { createSignal } from 'solid-js'
import { createDomRef, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-drag-constraints-ref',
  title: 'Interaction: element constraints + dragPropagation',
  group: 'reference',
  description: 'dragConstraints as a container element (via createDomRef), and nested draggables with dragPropagation on and off.',
  covers: ['createDomRef', 'motion'],
} as const

export default function Demo() {
  const [container, containerRef] = createDomRef<HTMLDivElement>()
  const [propagate, setPropagate] = createSignal(false)
  const [outer, setOuter] = createSignal(0)
  const [inner, setInner] = createSignal(0)

  return (
    <>
      <Controls>
        <Button pressed={propagate()} onClick={() => setPropagate(v => !v)}>dragPropagation: {String(propagate())}</Button>
        <Readout label="outer drag events" value={outer()} />
        <Readout label="inner drag events" value={inner()} />
        <span>Left: box confined by its container element. Right: drag the small inner box; with propagation the outer drags as well.</span>
      </Controls>
      <Stage height="300px">
        <div
          ref={containerRef}
          data-testid="container"
          style={{ width: '260px', height: '200px', border: '2px solid var(--info)', 'border-radius': '10px' }}
        >
          <motion.div
            class="box"
            data-testid="ref-box"
            drag
            dragConstraints={container()}
            dragElastic={0}
            dragMomentum={false}
          />
        </div>
        <motion.div
          data-testid="outer"
          drag
          dragMomentum={false}
          style={{ width: '220px', height: '200px', background: 'var(--border)', borderRadius: '10px', padding: '10px' }}
          onDragStart={() => setOuter(n => n + 1)}
        >
          outer
          <motion.div
            class="box"
            data-testid="inner"
            style={{ width: '60px', height: '60px', background: '#f59e0b', marginTop: '10px' }}
            drag
            dragMomentum={false}
            dragPropagation={propagate()}
            onDragStart={() => setInner(n => n + 1)}
          />
        </motion.div>
      </Stage>
    </>
  )
}
