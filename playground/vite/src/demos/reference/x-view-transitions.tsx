import { createSignal, Show } from 'solid-js'
import {
  AnimateView,
  ViewTransitionBuilder,
  animateView,
  getViewAnimationLayerInfo,
  getViewAnimations,
  startTransition,
} from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-view-transitions',
  title: 'View transitions: AnimateView, startTransition, animateView',
  group: 'reference',
  description:
    'Toggle a card inside <AnimateView> through startTransition (custom enter/exit), run a second box through the imperative animateView() builder, and sample getViewAnimations() while a transition plays. getViewAnimationLayerInfo decodes pseudo-element names. Needs a browser with the View Transitions API (Chromium).',
  covers: ['AnimateView', 'ViewTransitionBuilder', 'animateView', 'getViewAnimationLayerInfo', 'getViewAnimations', 'startTransition'],
} as const

export default function Demo() {
  const [show, setShow] = createSignal(true)
  const [info, setInfo] = createSignal('idle')
  const [live, setLive] = createSignal(0)
  const [events, setEvents] = createSignal('none')
  let imperative!: HTMLDivElement

  const sample = () => {
    let peak = 0
    const started = performance.now()
    const loop = () => {
      peak = Math.max(peak, getViewAnimations().length)
      setLive(peak)
      if (performance.now() - started < 700) requestAnimationFrame(loop)
    }
    loop()
  }

  const toggle = () => {
    const transition = startTransition(() => setShow(v => !v))
    setInfo(`startTransition returned ${transition ? 'a ViewTransition' : 'undefined'}`)
    sample()
  }

  const imperativeToggle = () => {
    const builder = animateView(
      () => {
        imperative.style.width = imperative.style.width === '220px' ? '90px' : '220px'
      },
      { transition: { duration: 0.4 } } as never,
    )
    setInfo(`animateView returned ViewTransitionBuilder: ${builder instanceof ViewTransitionBuilder}`)
    builder.then(() => setInfo(i => i + ' (resolved)'))
    sample()
  }

  return (
    <>
      <Controls>
        <Button onClick={toggle}>startTransition toggle card</Button>
        <Button onClick={imperativeToggle}>animateView width toggle</Button>
      </Controls>
      <Readout label="info" value={info()} />
      <Readout label="peak getViewAnimations().length" value={live()} />
      <Readout label="animation events" value={events()} />
      <Readout
        label="getViewAnimationLayerInfo"
        value={JSON.stringify([
          getViewAnimationLayerInfo('::view-transition-old(card)'),
          getViewAnimationLayerInfo('::view-transition-group(card)'),
          getViewAnimationLayerInfo('::view-transition-new(card)'),
        ])}
      />
      <div style={{ display: 'flex', gap: '16px', 'min-height': '90px', 'align-items': 'center' }}>
        <Show when={show()}>
          <AnimateView
            name="card"
            enter={{ opacity: [0, 1], transform: ['scale(0.5)', 'scale(1)'] }}
            exit={{ opacity: [1, 0], transform: ['scale(1)', 'scale(0.5)'] }}
            transition={{ duration: 0.4 }}
            onAnimationStart={(_animation, type) => setEvents(`start ${type}`)}
            onAnimationComplete={type => setEvents(`complete ${type}`)}
          >
            <div data-testid="card" class="box" style={{ width: '90px', height: '60px' }} />
          </AnimateView>
        </Show>
        <div ref={imperative} data-testid="imperative" class="box" style={{ width: '90px', height: '60px', 'view-transition-name': 'imperative' }} />
      </div>
    </>
  )
}
