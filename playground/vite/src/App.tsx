import { createSignal, For, Match, Switch } from 'solid-js'
import { BasicDemo } from './demos/basic'
import { VariantsDemo } from './demos/variants'
import { GesturesDemo } from './demos/gestures'
import { PresenceDemo } from './demos/presence'
import { ReorderDemo } from './demos/reorder'
import { LayoutDemo } from './demos/layout'
import { ScrollDemo } from './demos/scroll'

const demos = ['basic', 'variants', 'gestures', 'presence', 'reorder', 'layout', 'scroll'] as const
type Demo = typeof demos[number]

export function App() {
  const [current, setCurrent] = createSignal<Demo>('basic')

  return (
    <>
      <nav>
        <For each={demos}>
          {name => (
            <button aria-current={current() === name ? "true" : "false"} onClick={() => setCurrent(name)}>
              {name}
            </button>
          )}
        </For>
      </nav>
      <main>
        <Switch>
          <Match when={current() === 'basic'}><BasicDemo /></Match>
          <Match when={current() === 'variants'}><VariantsDemo /></Match>
          <Match when={current() === 'gestures'}><GesturesDemo /></Match>
          <Match when={current() === 'presence'}><PresenceDemo /></Match>
          <Match when={current() === 'reorder'}><ReorderDemo /></Match>
          <Match when={current() === 'layout'}><LayoutDemo /></Match>
          <Match when={current() === 'scroll'}><ScrollDemo /></Match>
        </Switch>
      </main>
    </>
  )
}
