import { createSignal } from 'solid-js'
import { createMotionValue, createMotionValueEvent, motion } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-transform-template',
  title: 'transformTemplate',
  group: 'reference',
  description: 'transformTemplate rewrites the final transform string (here centring with translate(-50%, -50%)) and shows the resulting computed transform.',
  covers: ['createMotionValue', 'createMotionValueEvent', 'motion'],
} as const

export default function Demo() {
  const [on, setOn] = createSignal(true)
  const [transform, setTransform] = createSignal('-')
  const rotate = createMotionValue(0)
  let el: HTMLDivElement | undefined
  createMotionValueEvent(rotate, 'change', () => {
    if (el) setTransform(el.style.transform)
  })

  return (
    <>
      <Controls>
        <Button pressed={on()} onClick={() => setOn(v => !v)}>transformTemplate: {on() ? 'on' : 'off'}</Button>
        <Button onClick={() => rotate.set(rotate.get() + 45)}>rotate +45</Button>
        <Readout label="style.transform" value={transform()} />
      </Controls>
      <Stage height="220px">
        <div style={{ position: 'relative', width: '300px', height: '160px', border: '1px dashed var(--info)' }}>
          <motion.div
            ref={el}
            class="box"
            data-testid="templated"
            style={{ position: 'absolute', top: '50%', left: '50%', rotate }}
            animate={{ scale: on() ? 1.2 : 1 }}
            transformTemplate={on() ? (_latest, generated) => `translate(-50%, -50%) ${generated}` : undefined}
          />
        </div>
      </Stage>
    </>
  )
}
