import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'
import { Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'i-press-tap',
  title: 'Interaction: press + tap (+ global target)',
  group: 'reference',
  description: 'whilePress/onPress* and the whileTap/onTap* aliases, plus globalPressTarget/globalTapTarget: release outside the element still ends the press.',
  covers: ['motion'],
} as const

export default function Demo() {
  const [log, setLog] = createSignal<string[]>([])
  const push = (name: string) => setLog(list => [...list.slice(-5), name])
  const count = (name: string) => log().filter(entry => entry === name).length

  return (
    <>
      <Controls>
        <Readout label="pressStart" value={count('pressStart')} />
        <Readout label="press" value={count('press')} />
        <Readout label="pressCancel" value={count('pressCancel')} />
        <Readout label="tapStart" value={count('tapStart')} />
        <Readout label="tap" value={count('tap')} />
        <Readout label="tapCancel" value={count('tapCancel')} />
      </Controls>
      <Controls>
        <Readout label="recent" value={log().join(' > ') || '-'} />
      </Controls>
      <Stage height="220px">
        <motion.div
          class="box"
          data-testid="press-box"
          whilePress={{ scale: 0.8, backgroundColor: '#ef4444' }}
          onPressStart={() => push('pressStart')}
          onPress={() => push('press')}
          onPressCancel={() => push('pressCancel')}
        />
        <motion.div
          class="box"
          data-testid="tap-box"
          whileTap={{ rotate: 20, scale: 0.9 }}
          onTapStart={() => push('tapStart')}
          onTap={() => push('tap')}
          onTapCancel={() => push('tapCancel')}
        />
        <motion.div
          class="box"
          data-testid="global-press-box"
          style={{ background: '#6366f1' }}
          globalPressTarget
          whilePress={{ scale: 1.4 }}
          onPressStart={() => push('globalPressStart')}
          onPress={() => push('globalPress')}
        />
        <motion.div
          class="box"
          data-testid="global-tap-box"
          style={{ background: '#14b8a6' }}
          globalTapTarget
          whileTap={{ scale: 1.4 }}
          onTapStart={() => push('globalTapStart')}
          onTap={() => push('globalTap')}
        />
      </Stage>
      <p>Boxes 3 and 4 (global targets) count a release anywhere on the page as the end of the press.</p>
    </>
  )
}
