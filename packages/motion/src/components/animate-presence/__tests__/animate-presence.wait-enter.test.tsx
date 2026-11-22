import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEffect, createSignal, flush, onCleanup, onSettled, Show } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'
import { createInView } from '@/utils/use-in-view'
import { MockIntersectionObserver, installIntersectionObserver, triggerIntersection } from '@/shared/mock-intersection-observer'
import { delay } from '@/shared/test'

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? document.body : null
  },
})

beforeEach(() => {
  installIntersectionObserver()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * Samples `read` for the element matching `selector` every few ms, but only once it is in the
 * document (a detached subtree is invisible to `querySelector`).
 */
function sample(container: HTMLElement, selector: string, read: (el: HTMLElement) => number) {
  const started = performance.now()
  const samples: { at: number, value: number }[] = []
  const timer = setInterval(() => {
    const el = container.querySelector<HTMLElement>(selector)
    if (el)
      samples.push({ at: performance.now() - started, value: read(el) })
  }, 4)
  return { samples, stop: () => clearInterval(timer) }
}

const opacityOf = (el: HTMLElement) => Number.parseFloat(el.style.opacity)

describe('AnimatePresence mode="wait" entering child', () => {
  it('is inserted only after the exit, and animates in from its initial values', async () => {
    const [key, setKey] = createSignal('a')
    const { container } = render(() => (
      <AnimatePresence mode="wait">
        <Show when={key()} keyed>
          {k => (
            <Motion data-k={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          )}
        </Show>
      </AnimatePresence>
    ))
    await delay(150)
    expect((container.firstElementChild as HTMLElement).dataset.k).toBe('a')
    const probe = sample(container, '[data-k="b"]', opacityOf)
    setKey('b')
    flush()
    await delay(600)
    probe.stop()
    const b = container.querySelector<HTMLElement>('[data-k="b"]')
    expect(container.querySelector('[data-k="a"]')).toBeNull()
    expect(probe.samples.length).toBeGreaterThan(3)
    // Inserted only once the 200ms exit has finished...
    expect(probe.samples[0].at).toBeGreaterThan(120)
    // ...at its initial value, not already part-way through a detached animation.
    expect(probe.samples[0].value).toBeLessThan(0.2)
    expect(Math.max(...probe.samples.map(s => s.value))).toBe(1)
    expect(opacityOf(b!)).toBe(1)
  })

  it('does not run effects or onSettled of the entering child until it is inserted', async () => {
    const log: string[] = []
    const [key, setKey] = createSignal('a')
    function Child(props: { k: string }) {
      let el!: HTMLDivElement
      createEffect(() => props.k, (k) => {
        log.push(`effect ${k} connected=${el.isConnected}`)
      })
      onSettled(() => {
        log.push(`settled ${props.k} connected=${el.isConnected}`)
        return () => {
          log.push(`cleanup ${props.k}`)
        }
      })
      return (
        <Motion ref={el} data-k={props.k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      )
    }
    const { container } = render(() => (
      <AnimatePresence mode="wait">
        <Show when={key()} keyed>{k => <Child k={k} />}</Show>
      </AnimatePresence>
    ))
    await delay(50)
    expect(log).toContain('effect a connected=true')
    expect(log).toContain('settled a connected=true')
    setKey('b')
    flush()
    await delay(120)
    // The old child is still leaving: nothing of b has run, and a is still on screen.
    expect(log.filter(l => l.includes(' b'))).toEqual([])
    expect(container.querySelector('[data-k="a"]')).not.toBeNull()
    expect(container.querySelector('[data-k="b"]')).toBeNull()
    await delay(500)
    expect(container.querySelector('[data-k="a"]')).toBeNull()
    expect(container.querySelector('[data-k="b"]')).not.toBeNull()
    expect(log).toContain('effect b connected=true')
    expect(log).toContain('settled b connected=true')
    expect(log.indexOf('cleanup a')).toBeGreaterThan(-1)
  })

  it('runs variant orchestration (staggerChildren) after insertion', async () => {
    const [key, setKey] = createSignal('a')
    const { container } = render(() => (
      <AnimatePresence mode="wait">
        <Show when={key()} keyed>
          {k => (
            <Motion
              data-k={k}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              variants={{ hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
              transition={{ duration: 0.1 }}
            >
              <Motion class="one" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ duration: 0.1 }} />
              <Motion class="two" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} transition={{ duration: 0.1 }} />
            </Motion>
          )}
        </Show>
      </AnimatePresence>
    ))
    await delay(500)
    setKey('b')
    flush()
    const one = sample(container, '[data-k="b"] .one', opacityOf)
    const two = sample(container, '[data-k="b"] .two', opacityOf)
    await delay(900)
    one.stop()
    two.stop()
    expect(one.samples[0].value).toBeLessThan(0.2)
    expect(two.samples[0].value).toBeLessThan(0.2)
    const risingAt = (s: typeof one.samples) => s.find(x => x.value > 0.3)!.at
    // Staggered from insertion: the second starts roughly 150ms after the first.
    expect(risingAt(two.samples) - risingAt(one.samples)).toBeGreaterThan(80)
    expect(opacityOf(container.querySelector<HTMLElement>('[data-k="b"] .two')!)).toBe(1)
  })

  it('observes the entering child with createInView and whileInView against the document', async () => {
    const observed: { el: Element, connected: boolean }[] = []
    const observe = MockIntersectionObserver.prototype.observe
    vi.spyOn(MockIntersectionObserver.prototype, 'observe').mockImplementation(function (this: MockIntersectionObserver, el: Element) {
      observed.push({ el, connected: el.isConnected })
      return observe.call(this, el)
    })
    const [key, setKey] = createSignal('a')
    const seen: Record<string, boolean> = {}
    function Child(props: { k: string }) {
      let el!: HTMLDivElement
      const inView = createInView(() => el)
      createEffect(inView, (v) => {
        seen[props.k] = v
      })
      return (
        <Motion
          ref={el}
          data-k={props.k}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        />
      )
    }
    const { container } = render(() => (
      <AnimatePresence mode="wait">
        <Show when={key()} keyed>{k => <Child k={k} />}</Show>
      </AnimatePresence>
    ))
    await delay(50)
    expect(observed.length).toBeGreaterThan(0)
    // Bring `a` into view so its exit has something to animate.
    triggerIntersection(container.querySelector('[data-k="a"]')!, true)
    flush()
    await delay(250)
    const before = observed.length
    setKey('b')
    flush()
    await delay(60)
    // The exit is running: the entering child is not observed yet.
    expect(observed.slice(before)).toEqual([])
    await delay(400)
    const b = container.querySelector<HTMLElement>('[data-k="b"]')!
    expect(b).not.toBeNull()
    const added = observed.slice(before)
    expect(added.length).toBeGreaterThan(0)
    expect(added.every(o => o.connected)).toBe(true)
    expect(added.some(o => o.el === b)).toBe(true)
    triggerIntersection(b, true)
    flush()
    await delay(300)
    expect(seen.b).toBe(true)
    expect(opacityOf(b)).toBe(1)
  })

  it('drops a child that is replaced mid-exit without ever running or leaking it', async () => {
    const log: string[] = []
    const [key, setKey] = createSignal('a')
    function Child(props: { k: string }) {
      createEffect(() => props.k, (k) => {
        log.push(`effect ${k}`)
      })
      onSettled(() => {
        log.push(`settled ${props.k}`)
      })
      onCleanup(() => {
        log.push(`dispose ${props.k}`)
      })
      return (
        <Motion data-k={props.k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      )
    }
    const exits = vi.fn()
    const { container } = render(() => (
      <AnimatePresence mode="wait" onExitComplete={exits}>
        <Show when={key()} keyed>{k => <Child k={k} />}</Show>
      </AnimatePresence>
    ))
    await delay(450)
    setKey('b')
    flush()
    await delay(80)
    setKey('c')
    flush()
    await delay(700)
    expect(log.filter(l => l.endsWith(' b') && !l.startsWith('dispose'))).toEqual([])
    expect(log).toContain('dispose b')
    expect(container.querySelectorAll('[data-k]').length).toBe(1)
    expect(container.querySelector('[data-k="c"]')).not.toBeNull()
    expect(log.filter(l => l === 'settled c').length).toBe(1)
    expect(log.filter(l => l === 'effect c').length).toBe(1)
    // The old child left once, not once per replacement.
    expect(exits).toHaveBeenCalledTimes(1)
  })

  it('removes the leaving child when nothing replaces it, and shows one that arrives later', async () => {
    const [on, setOn] = createSignal(true)
    const { container } = render(() => (
      <AnimatePresence mode="wait">
        <Show when={on()}>
          <Motion data-k="x" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} />
        </Show>
      </AnimatePresence>
    ))
    await delay(200)
    setOn(false)
    flush()
    await delay(400)
    expect(container.querySelector('[data-k="x"]')).toBeNull()
    setOn(true)
    flush()
    const probe = sample(container, '[data-k="x"]', opacityOf)
    await delay(400)
    probe.stop()
    expect(probe.samples[0].value).toBeLessThan(0.3)
    expect(opacityOf(container.querySelector<HTMLElement>('[data-k="x"]')!)).toBe(1)
  })

  it('exits the leaving child with the custom value of the new render', async () => {
    const [dir, setDir] = createSignal(1)
    const [key, setKey] = createSignal('a')
    const { container } = render(() => (
      <AnimatePresence mode="wait" custom={dir()}>
        <Show when={key()} keyed>
          {k => (
            <Motion
              data-k={k}
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit="out"
              variants={{ out: (d: number) => ({ x: d * 100 }) }}
              transition={{ duration: 0.1 }}
            />
          )}
        </Show>
      </AnimatePresence>
    ))
    await delay(200)
    const a = container.querySelector<HTMLElement>('[data-k="a"]')!
    setDir(-1)
    setKey('b')
    flush()
    await delay(250)
    expect(a.style.transform).toContain('-100px')
    expect(container.querySelector('[data-k="b"]')).not.toBeNull()
  })

  it('initial={false} skips the first child\'s mount animation but later children still animate in', async () => {
    const [key, setKey] = createSignal('a')
    const { container } = render(() => (
      <AnimatePresence mode="wait" initial={false}>
        <Show when={key()} keyed>
          {k => (
            <Motion data-k={k} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          )}
        </Show>
      </AnimatePresence>
    ))
    expect(opacityOf(container.querySelector<HTMLElement>('[data-k="a"]')!)).toBe(1)
    const probe = sample(container, '[data-k="b"]', opacityOf)
    setKey('b')
    flush()
    await delay(600)
    probe.stop()
    expect(probe.samples[0].at).toBeGreaterThan(120)
    expect(probe.samples[0].value).toBeLessThan(0.2)
    expect(opacityOf(container.querySelector<HTMLElement>('[data-k="b"]')!)).toBe(1)
  })

  it('warns, as React does, when several children share a wait presence', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(() => (
      <AnimatePresence mode="wait">
        <Motion data-k="1" />
        <Motion data-k="2" />
      </AnimatePresence>
    ))
    await delay(20)
    const messages = warn.mock.calls.map(c => String(c[0]))
    warn.mockRestore()
    expect(messages.some(m => m.includes('multiple children within AnimatePresence'))).toBe(true)
  })
})
