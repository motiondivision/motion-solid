import { createSignal, For, onSettled } from 'solid-js'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'story-1',
  title: 'Scroll story 1: plain page',
  group: 'cumulative',
  description: 'Baseline for the scroll story: a long page of five sections and a sticky HUD fed by a plain scroll listener. No motion-solid yet, so later stages can be compared against it.',
  covers: [],
  level: 1,
} as const

const sections = ['Arrival', 'Context', 'Detail', 'Evidence', 'Departure']
const hues = [210, 260, 320, 20, 150]

export default function Demo() {
  const [y, setY] = createSignal(0)
  const [max, setMax] = createSignal(1)
  let root!: HTMLDivElement

  onSettled(() => {
    const update = () => {
      setY(window.scrollY)
      setMax(Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  })

  const jump = (index: number) => root.querySelectorAll('section')[index]?.scrollIntoView({ behavior: 'instant' })

  return (
    <div ref={root}>
      <div style={{ position: 'sticky', top: '0', 'z-index': '5', background: 'var(--bg)', 'padding-bottom': '4px' }}>
        <Controls>
          <Readout label="scrollY" value={Math.round(y()).toString()} />
          <Readout label="progress" value={(y() / max()).toFixed(3)} />
          <For each={sections}>{(name, i) => <Button onClick={() => jump(i())}>{name}</Button>}</For>
          <Button onClick={() => window.scrollTo(0, 0)}>Top</Button>
        </Controls>
      </div>
      <For each={sections}>
        {(name, i) => (
          <section
            data-testid="section"
            style={{
              height: '80vh',
              margin: '0 0 12px',
              padding: '24px',
              'border-radius': '12px',
              background: `hsl(${hues[i()]} 60% 60% / .35)`,
              display: 'flex',
              'flex-direction': 'column',
              'justify-content': 'center',
            }}
          >
            <h2 style={{ margin: '0 0 8px', 'font-size': '36px' }}>{i() + 1}. {name}</h2>
            <p style={{ margin: '0', color: 'var(--muted)', 'max-width': '48ch' }}>
              Static content. Everything in the next stages is layered over this exact page.
            </p>
          </section>
        )}
      </For>
    </div>
  )
}
