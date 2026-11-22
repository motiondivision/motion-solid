import { createSignal, onCleanup } from 'solid-js'
import { motion, motionGlobalConfig } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-css-vars-global',
  title: 'CSS variables + motionGlobalConfig',
  group: 'reference',
  description: 'Animating CSS custom properties through animate, and the motionAttribute from motionGlobalConfig that marks motion elements in the DOM.',
  covers: ['motion', 'motionGlobalConfig'],
} as const

export default function Demo() {
  const [on, setOn] = createSignal(false)
  const [attr, setAttr] = createSignal(motionGlobalConfig.motionAttribute)
  let el: HTMLDivElement | undefined
  const original = motionGlobalConfig.motionAttribute
  onCleanup(() => { motionGlobalConfig.motionAttribute = original })

  return (
    <>
      <Controls>
        <Button onClick={() => setOn(v => !v)}>Toggle --hue and --size</Button>
        <Readout label="global motionAttribute" value={attr()} />
        <Readout label="element has attribute" value={String(!!el && el.hasAttribute(attr()))} ok={!!el && el.hasAttribute(attr())} />
        <Button onClick={() => { motionGlobalConfig.motionAttribute = 'data-mv'; setAttr('data-mv') }}>Set attribute data-mv (use Remount)</Button>
        <Button onClick={() => { motionGlobalConfig.motionAttribute = original; setAttr(original) }}>Restore</Button>
      </Controls>
      <Stage height="200px">
        <motion.div
          ref={el}
          data-testid="vars-box"
          style={{
            '--hue': 220,
            '--size': '100px',
            width: 'var(--size)',
            height: 'var(--size)',
            background: 'hsl(var(--hue) 80% 55%)',
            borderRadius: '12px',
          }}
          animate={{ '--hue': on() ? 20 : 220, '--size': on() ? '160px' : '100px' }}
          transition={{ duration: 0.8 }}
        />
      </Stage>
    </>
  )
}
