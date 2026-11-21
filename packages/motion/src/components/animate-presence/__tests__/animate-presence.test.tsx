import { describe, expect, it, vi } from 'vitest'
import { createSignal, flush, For, Show } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { AnimatePresence, createIsPresent, createPresence, createPresenceData } from '@/components/animate-presence'
import { Motion } from '@/components/motion'
import { mountedStates } from '@/state/motion-state'
import { delay } from '@/shared/test'

// jsdom reports offsetParent === null for every element, which makes AnimationFeature treat
// mounted elements as hidden. Emulate the browser: connected elements have an offsetParent.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? document.body : null
  },
})

const fade = (duration: number) => ({
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration },
})

describe('AnimatePresence exits', () => {
  it('keeps an element mounted until its exit finishes, then fires onExitComplete once', async () => {
    const onExitComplete = vi.fn()
    const [items, setItems] = createSignal([0])
    render(() => (
      <AnimatePresence onExitComplete={onExitComplete}>
        <For each={items()}>{() => <Motion class="item" {...fade(0.3)} />}</For>
      </AnimatePresence>
    ))
    await delay(50)
    const el = document.querySelector('.item') as HTMLElement
    expect(el.isConnected).toBe(true)

    setItems([])
    flush()
    await delay(50)
    expect(el.isConnected).toBe(true)
    expect(onExitComplete).not.toHaveBeenCalled()

    await delay(400)
    expect(el.isConnected).toBe(false)
    expect(onExitComplete).toHaveBeenCalledTimes(1)
    expect(mountedStates.get(el)).toBeUndefined()
  })

  it('fires onExitComplete once when sibling motion children leave together', async () => {
    const onExitComplete = vi.fn()
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence onExitComplete={onExitComplete}>
        <Show when={show()}>
          <Motion class="a" {...fade(0.05)} />
          <Motion class="b" {...fade(0.05)} />
        </Show>
      </AnimatePresence>
    ))
    await delay(20)
    setShow(false)
    flush()
    await delay(200)
    expect(document.querySelector('.a')).toBeNull()
    expect(document.querySelector('.b')).toBeNull()
    expect(onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('waits for the motion sibling before firing onExitComplete in a mixed batch', async () => {
    const onExitComplete = vi.fn()
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence onExitComplete={onExitComplete}>
        <Show when={show()}>
          <Motion class="a" {...fade(0.2)} />
          <div class="plain">plain</div>
        </Show>
      </AnimatePresence>
    ))
    await delay(20)
    setShow(false)
    flush()
    await delay(50)
    expect(document.querySelector('.plain')).toBeNull()
    expect(onExitComplete).not.toHaveBeenCalled()

    await delay(300)
    expect(document.querySelector('.a')).toBeNull()
    expect(onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('sync mode: the entering child is inserted while the exiting one is still animating', async () => {
    const [key, setKey] = createSignal('a')
    render(() => (
      <AnimatePresence>
        <Show when={key()} keyed>
          {k => <Motion class={`item-${k}`} {...fade(0.2)} />}
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    setKey('b')
    flush()
    await delay(50)
    expect(document.querySelector('.item-a')).not.toBeNull()
    expect(document.querySelector('.item-b')).not.toBeNull()
    await delay(300)
    expect(document.querySelector('.item-a')).toBeNull()
    expect(document.querySelector('.item-b')).not.toBeNull()
  })

  it('wait mode: the entering child is inserted only after the exit finishes', async () => {
    const onExitComplete = vi.fn()
    const [key, setKey] = createSignal('a')
    render(() => (
      <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
        <Show when={key()} keyed>
          {k => <Motion class={`item-${k}`} {...fade(0.2)} />}
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    expect(document.querySelector('.item-a')).not.toBeNull()
    setKey('b')
    flush()
    await delay(60)
    expect(document.querySelector('.item-a')).not.toBeNull()
    expect(document.querySelector('.item-b')).toBeNull()
    await delay(300)
    expect(document.querySelector('.item-a')).toBeNull()
    expect(document.querySelector('.item-b')).not.toBeNull()
    expect(onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('wait mode: a change during the exit enters only the latest child', async () => {
    const [key, setKey] = createSignal('a')
    render(() => (
      <AnimatePresence mode="wait">
        <Show when={key()} keyed>
          {k => <Motion class={`item-${k}`} {...fade(0.15)} />}
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    setKey('b')
    flush()
    await delay(30)
    setKey('c')
    flush()
    await delay(350)
    expect(document.querySelector('.item-a')).toBeNull()
    expect(document.querySelector('.item-b')).toBeNull()
    expect(document.querySelector('.item-c')).not.toBeNull()
  })

  it('popLayout mode pins the exiting element while it animates out', async () => {
    const [show, setShow] = createSignal(true)
    render(() => (
      <AnimatePresence mode="popLayout">
        <Show when={show()}><Motion class="pop" {...fade(0.15)} /></Show>
      </AnimatePresence>
    ))
    await delay(30)
    const el = document.querySelector('.pop') as HTMLElement
    setShow(false)
    flush()
    await delay(30)
    expect(el.isConnected).toBe(true)
    expect(el.dataset.motionPopId).toMatch(/^pop-/)
    await delay(300)
    expect(el.isConnected).toBe(false)
    expect(document.head.querySelectorAll('style').length).toBe(0)
  })

  it('initial={false} skips the initial animation of children present on first render only', async () => {
    const [show, setShow] = createSignal(false)
    render(() => (
      <AnimatePresence initial={false}>
        <Motion class="first" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 5 }} />
        <Show when={show()}>
          <Motion class="later" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 5 }} />
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    expect((document.querySelector('.first') as HTMLElement).style.opacity).toBe('1')
    setShow(true)
    flush()
    await delay(30)
    // A later child still plays its initial: it starts from 0 and is mid-animation.
    expect(Number((document.querySelector('.later') as HTMLElement).style.opacity)).toBeLessThan(0.5)
  })

  it('passes custom to exit variants', async () => {
    const [custom, setCustom] = createSignal(1)
    const [show, setShow] = createSignal(true)
    const seen: number[] = []
    render(() => (
      <AnimatePresence custom={custom()}>
        <Show when={show()}>
          <Motion
            class="v"
            initial="in"
            animate="in"
            exit="out"
            variants={{
              in: { opacity: 1 },
              out: (c: number) => {
                seen.push(c)
                return { opacity: 0, transition: { duration: 0.05 } }
              },
            }}
          />
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    setCustom(7)
    flush()
    setShow(false)
    flush()
    await delay(150)
    expect(seen).toContain(7)
    expect(document.querySelector('.v')).toBeNull()
  })

  it('removing and re-adding the same node during its exit re-enters instead of removing', async () => {
    const node = document.createElement('div')
    node.className = 'raw'
    const [shown, setShown] = createSignal(true)
    const enterSpy = vi.fn()
    render(() => (
      <AnimatePresence>
        <Show when={shown()}>{node}</Show>
        <Probe node={node} onEnter={enterSpy} />
      </AnimatePresence>
    ))
    await delay(20)
    setShown(false)
    flush()
    await delay(20)
    // The probe holds the exit open, so the node is still present.
    expect(node.isConnected).toBe(true)
    setShown(true)
    flush()
    await delay(20)
    expect(enterSpy).toHaveBeenCalledTimes(1)
    expect(node.isConnected).toBe(true)
    await delay(100)
    expect(node.isConnected).toBe(true)
  })

  it('nested AnimatePresence scope their own exits', async () => {
    const outerDone = vi.fn()
    const innerDone = vi.fn()
    const [inner, setInner] = createSignal(true)
    render(() => (
      <AnimatePresence onExitComplete={outerDone}>
        <div class="outer">
          <AnimatePresence onExitComplete={innerDone}>
            <Show when={inner()}><Motion class="inner" {...fade(0.05)} /></Show>
          </AnimatePresence>
        </div>
      </AnimatePresence>
    ))
    await delay(30)
    setInner(false)
    flush()
    await delay(200)
    expect(document.querySelector('.inner')).toBeNull()
    expect(document.querySelector('.outer')).not.toBeNull()
    expect(innerDone).toHaveBeenCalledTimes(1)
    expect(outerDone).not.toHaveBeenCalled()
  })

  it('renders a wrapper element when `as` is given', async () => {
    render(() => (
      <AnimatePresence as="ul"><li>one</li></AnimatePresence>
    ))
    expect(document.querySelector('ul > li')).not.toBeNull()
  })

  it('disposing the container does not report exit completion', async () => {
    const onExitComplete = vi.fn()
    const [show, setShow] = createSignal(true)
    const { unmount } = render(() => (
      <AnimatePresence onExitComplete={onExitComplete}>
        <Show when={show()}><Motion class="gone" {...fade(0.2)} /></Show>
      </AnimatePresence>
    ))
    await delay(30)
    setShow(false)
    flush()
    unmount()
    await delay(300)
    expect(onExitComplete).not.toHaveBeenCalled()
  })
})

function Probe(props: { node: Element, onEnter: () => void }) {
  // Holds the exit of `props.node` open until the test re-adds it.
  createPresence({
    element: () => props.node,
    onExit: () => new Promise(() => {}),
    onEnter: props.onEnter,
  })
  return null
}

describe('createPresence / createIsPresent / createPresenceData', () => {
  function Child(props: { onSafe?: (fn: VoidFunction) => void, log: string[] }) {
    let el!: HTMLDivElement
    const [isPresent, safeToRemove] = createPresence({ element: () => el })
    const data = createPresenceData<string>()
    props.onSafe?.(safeToRemove)
    return <div ref={el} class="child">{`${isPresent() ? 'present' : 'leaving'}:${data()}`}</div>
  }

  it('holds removal until safeToRemove is called and exposes isPresent and custom data', async () => {
    const [show, setShow] = createSignal(true)
    let safe!: VoidFunction
    const onExitComplete = vi.fn()
    render(() => (
      <AnimatePresence custom="x" onExitComplete={onExitComplete}>
        <Show when={show()}><Child log={[]} onSafe={(f) => { safe = f }} /></Show>
      </AnimatePresence>
    ))
    await delay(20)
    const el = document.querySelector('.child') as HTMLElement
    expect(el.textContent).toBe('present:x')
    setShow(false)
    flush()
    await delay(30)
    expect(el.isConnected).toBe(true)
    safe()
    await delay(30)
    expect(el.isConnected).toBe(false)
    expect(onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('createIsPresent flips to false during exit without holding removal', async () => {
    const [show, setShow] = createSignal(true)
    let present!: () => boolean
    function IsPresentChild() {
      let el!: HTMLDivElement
      present = createIsPresent(() => el)
      return <div ref={el} class="ip" />
    }
    render(() => (
      <AnimatePresence>
        <Show when={show()}><IsPresentChild /></Show>
      </AnimatePresence>
    ))
    await delay(20)
    expect(present()).toBe(true)
    setShow(false)
    flush()
    expect(present()).toBe(false)
    await delay(30)
    expect(document.querySelector('.ip')).toBeNull()
  })

  it('is always present and inert outside an AnimatePresence', () => {
    let result!: [() => boolean, VoidFunction]
    function Bare() {
      result = createPresence({ element: () => undefined })
      return null
    }
    render(() => <Bare />)
    expect(result[0]()).toBe(true)
    expect(() => result[1]()).not.toThrow()
  })
})
