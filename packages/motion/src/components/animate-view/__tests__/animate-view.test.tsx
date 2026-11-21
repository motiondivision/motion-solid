import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Show, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { AnimateView } from '@/components/animate-view/AnimateView'
import { startTransition } from '@/components/animate-view/start-transition'
import { animateViewLayers } from '@/components/animate-view/animate-view-layers'

vi.mock('@/components/animate-view/animate-view-layers', () => ({
  animateViewLayers: vi.fn(() => () => {}),
}))

const mockAnimateViewLayers = animateViewLayers as Mock

interface FakeViewTransition {
  ready: Promise<void>
  finished: Promise<void>
  updateCallbackDone: Promise<void>
  skipTransition: () => void
}

function installFakeViewTransition() {
  const transitions: FakeViewTransition[] = [];

  (document as any).startViewTransition = (callback?: () => Promise<void>) => {
    const updateCallbackDone = Promise.resolve().then(() => callback?.())
    const transition: FakeViewTransition = {
      updateCallbackDone,
      ready: updateCallbackDone.then(() => {}),
      finished: updateCallbackDone.then(() => {}),
      skipTransition: () => {},
    }
    transitions.push(transition)
    return transition
  }

  return transitions
}

/**
 * Like installFakeViewTransition, but `finished` stays pending until the
 * returned `finish()` is called — for tests that assert state mid-playback.
 */
function installManualViewTransition() {
  let resolveFinished!: () => void
  ;(document as any).startViewTransition = (callback?: () => Promise<void>) => {
    const updateCallbackDone = Promise.resolve().then(() => callback?.())
    return {
      updateCallbackDone,
      ready: updateCallbackDone.then(() => {}),
      finished: new Promise<void>((resolve) => {
        resolveFinished = resolve
      }),
      skipTransition: () => {},
    }
  }
  return { finish: () => resolveFinished() }
}

async function settle(transition: FakeViewTransition | undefined) {
  if (!transition)
    return
  await transition.ready
  await transition.finished
  flush(); await Promise.resolve()
}

describe('animateView', () => {
  const originalStartViewTransition = (document as any).startViewTransition
  // jsdom has no WAAPI; the fake reports pseudoElement as honored
  const overlayAnimation = {
    cancel: vi.fn(),
    effect: { pseudoElement: '::view-transition' },
  }
  let animateMock: Mock

  beforeEach(() => {
    mockAnimateViewLayers.mockClear()
    overlayAnimation.cancel.mockClear()
    animateMock = vi.fn(() => overlayAnimation)
    ;(document.documentElement as any).animate = animateMock
  })

  afterEach(() => {
    (document as any).startViewTransition = originalStartViewTransition
  })

  it('runs the update without animation when the View Transitions API is unavailable', async () => {
    (document as any).startViewTransition = undefined
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    let ran = false
    const result = startTransition(() => {
      ran = true
    })

    expect(ran).toBe(true)
    expect(result).toBeUndefined()
    expect(mockAnimateViewLayers).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('animates an entering component with its uid layer name', async () => {
    installFakeViewTransition()
    const [show, setShow] = createSignal(false)

    render(() => (
      <Show when={show()}>
        <AnimateView enter={{ opacity: 1 }}><div class="box" /></AnimateView>
      </Show>
    ))

    const transition = startTransition(() => setShow(true), { types: ['toggle'] })
    await settle(transition)

    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect(mockAnimateViewLayers).toHaveBeenCalledWith(
      expect.stringMatching(/^motion-view-/),
      'enter',
      expect.objectContaining({ enter: { opacity: 1 } }),
      ['toggle'],
    )
  })

  it('animates an exiting component with a snapshot of its props', async () => {
    installFakeViewTransition()
    const [show, setShow] = createSignal(true)

    render(() => (
      <Show when={show()}>
        <AnimateView exit={{ opacity: 0 }}><div class="box" /></AnimateView>
      </Show>
    ))

    const transition = startTransition(() => setShow(false))
    await settle(transition)

    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect(mockAnimateViewLayers).toHaveBeenCalledWith(
      expect.stringMatching(/^motion-view-/),
      'exit',
      expect.objectContaining({ exit: { opacity: 0 } }),
      [],
    )
  })

  it('animates a changed component as an update and removes its layer names afterwards', async () => {
    installFakeViewTransition()
    const [message, setMessage] = createSignal('a')

    const { container } = render(() => (
      <AnimateView update={{ opacity: 1 }}><div class="box">{message()}</div></AnimateView>
    ))
    const element = container.querySelector('.box') as HTMLElement

    const transition = startTransition(() => setMessage('b'))
    await settle(transition)

    expect(element.textContent).toBe('b')
    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect(mockAnimateViewLayers).toHaveBeenCalledWith(
      expect.stringMatching(/^motion-view-/),
      'update',
      expect.objectContaining({ update: { opacity: 1 } }),
      [],
    )
    expect(element.style.getPropertyValue('view-transition-name')).toBe('')
  })

  it('does not detect layout-only changes without a DOM mutation (no rect measurement)', async () => {
    installFakeViewTransition()

    const { container } = render(() => <AnimateView><div class="box" /></AnimateView>)
    const element = container.querySelector('.box') as HTMLElement
    let rect = { x: 0, y: 0, width: 100, height: 100 }
    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => rect as DOMRect)

    const transition = startTransition(() => {
      rect = { ...rect, x: 50 }
    })
    await settle(transition)

    expect(mockAnimateViewLayers).not.toHaveBeenCalled()
  })

  it('pairs an exit and an enter with the same name as a single share animation', async () => {
    installFakeViewTransition()
    const [show, setShow] = createSignal(true)

    render(() => (
      <div>
        <Show when={show()}>
          <AnimateView name="item" exit={{ opacity: 0 }}><div class="item" /></AnimateView>
        </Show>
        <Show when={!show()}>
          <AnimateView name="item" share={{ opacity: 1 }} transition={{ duration: 1 }}><div class="modal" /></AnimateView>
        </Show>
      </div>
    ))

    const transition = startTransition(() => setShow(false))
    await settle(transition)

    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect(mockAnimateViewLayers).toHaveBeenCalledWith(
      'item',
      'share',
      // the entering side's props drive the shared animation
      expect.objectContaining({ share: { opacity: 1 }, transition: { duration: 1 } }),
      [],
    )
  })

  it('forwards transition types to animateViewLayers', async () => {
    installFakeViewTransition()
    const [show, setShow] = createSignal(false)

    render(() => (
      <Show when={show()}>
        <AnimateView enter={(types: string[]) => ({ opacity: types.includes('next') ? 1 : 0 })}>
          <div />
        </AnimateView>
      </Show>
    ))

    const transition = startTransition(() => setShow(true), { types: ['next'] })
    await settle(transition)

    expect(mockAnimateViewLayers).toHaveBeenCalledWith(
      expect.stringMatching(/^motion-view-/),
      'enter',
      expect.objectContaining({ enter: expect.any(Function) }),
      ['next'],
    )
  })

  it('closes the registration window once the update has flushed', async () => {
    let resolveFinished!: () => void
    ;(document as any).startViewTransition = (callback?: () => Promise<void>) => {
      const updateCallbackDone = Promise.resolve().then(() => callback?.())
      return {
        updateCallbackDone,
        ready: updateCallbackDone.then(() => {}),
        finished: new Promise<void>((resolve) => {
          resolveFinished = resolve
        }),
        skipTransition: () => {},
      }
    }

    const [show, setShow] = createSignal(false)
    render(() => (
      <Show when={show()}><AnimateView><div class="box" /></AnimateView></Show>
    ))

    const transition = startTransition(() => setShow(true)) as unknown as FakeViewTransition
    await transition.updateCallbackDone

    // A component mounting after the flush but while the animation is still
    // playing must NOT be registered as an "enter" participant
    const late = render(() => <AnimateView><div class="late" /></AnimateView>)
    flush(); await Promise.resolve()

    resolveFinished()
    await transition.ready
    await transition.finished
    flush(); await Promise.resolve()

    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect((late.container.querySelector('.late') as HTMLElement).style.getPropertyValue('view-transition-name')).toBe('')
    late.unmount()
  })

  it('cancels the layer animation when a participant unmounts mid-playback', async () => {
    const cleanup = vi.fn()
    mockAnimateViewLayers.mockReturnValueOnce(cleanup)

    let resolveFinished!: () => void
    ;(document as any).startViewTransition = (callback?: () => Promise<void>) => {
      const updateCallbackDone = Promise.resolve().then(() => callback?.())
      return {
        updateCallbackDone,
        ready: updateCallbackDone.then(() => {}),
        finished: new Promise<void>((resolve) => {
          resolveFinished = resolve
        }),
        skipTransition: () => {},
      }
    }

    const [message, setMessage] = createSignal('a')
    const view = render(() => (
      <AnimateView update={{ opacity: 1 }}><div class="box">{message()}</div></AnimateView>
    ))

    const transition = startTransition(() => setMessage('b')) as unknown as FakeViewTransition
    await transition.ready

    expect(mockAnimateViewLayers).toHaveBeenCalledTimes(1)
    expect(cleanup).not.toHaveBeenCalled()

    // Unmount while the (still unresolved) transition is playing
    view.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)

    resolveFinished()
    await transition.finished
  })

  it('suppresses the root layer before startViewTransition captures the old snapshot', async () => {
    // The browser captures the old snapshot when startViewTransition() is
    // invoked — the update callback runs strictly after. Suppressing the root
    // inside the callback leaves the root in the old snapshot, so it plays an
    // old-only fade-out ghost instead of a hard cut.
    let nameAtCapture = ''
    ;(document as any).startViewTransition = (callback?: () => Promise<void>) => {
      nameAtCapture = document.documentElement.style.getPropertyValue('view-transition-name')
      const updateCallbackDone = Promise.resolve().then(() => callback?.())
      return {
        updateCallbackDone,
        ready: updateCallbackDone.then(() => {}),
        finished: updateCallbackDone.then(() => {}),
        skipTransition: () => {},
      }
    }

    const transition = startTransition(() => {}) as unknown as FakeViewTransition
    await settle(transition)

    expect(nameAtCapture).toBe('none')
  })

  it('zero-sizes the pseudo overlay during the transition so clicks fall through, and cancels after finished', async () => {
    const { finish } = installManualViewTransition()

    const transition = startTransition(() => {}) as unknown as FakeViewTransition
    await transition.updateCallbackDone

    expect(animateMock).toHaveBeenCalledWith(
      { width: [0, 0], height: [0, 0] },
      expect.objectContaining({ fill: 'forwards', pseudoElement: '::view-transition' }),
    )
    expect(overlayAnimation.cancel).not.toHaveBeenCalled()

    finish()
    await transition.finished
    flush(); await Promise.resolve()

    expect(overlayAnimation.cancel).toHaveBeenCalledTimes(1)
  })

  it('cancels the overlay animation immediately when the pseudoElement option is not honored', async () => {
    // without WAAPI pseudoElement support the animation would target the
    // root element itself and collapse the page to 0x0
    const unsupported = { cancel: vi.fn(), effect: { pseudoElement: undefined } }
    animateMock.mockReturnValueOnce(unsupported as any)
    installFakeViewTransition()

    const transition = startTransition(() => {})
    await settle(transition)

    expect(unsupported.cancel).toHaveBeenCalledTimes(1)
  })

  it('suppresses the root layer by default and restores it after finished', async () => {
    const { finish } = installManualViewTransition()

    const transition = startTransition(() => {}) as unknown as FakeViewTransition
    await transition.updateCallbackDone

    const root = document.documentElement
    expect(root.style.getPropertyValue('view-transition-name')).toBe('none')
    // name-only root suppression: the only WAAPI animation is the overlay
    // zero-size — no opacity-hiding animations on root pseudo layers
    expect(animateMock).toHaveBeenCalledTimes(1)
    expect(animateMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pseudoElement: '::view-transition' }),
    )

    finish()
    await transition.finished
    flush(); await Promise.resolve()

    expect(root.style.getPropertyValue('view-transition-name')).toBe('')
  })

  it('keeps the root layer when the root option is set', async () => {
    installFakeViewTransition()

    const transition = startTransition(() => {}, { root: true })
    await settle(transition)

    expect(document.documentElement.style.getPropertyValue('view-transition-name')).toBe('')
    // pass-through only ships with root suppression: a captured root makes
    // the whole page non-hit-testable per spec, so zero-sizing would be moot
    expect(animateMock).not.toHaveBeenCalled()
  })

  it('cancels layer animations when the transition ends so they cannot revive under a reused name', async () => {
    const cleanup = vi.fn()
    mockAnimateViewLayers.mockReturnValueOnce(cleanup)
    installFakeViewTransition()

    const [show, setShow] = createSignal(false)
    render(() => (
      <Show when={show()}>
        <AnimateView enter={{ opacity: 1 }}><div class="box" /></AnimateView>
      </Show>
    ))

    const transition = startTransition(() => setShow(true))
    await settle(transition)

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('queues updates during playback and flushes them as one batched transition', async () => {
    const calls: string[] = []
    const startedTransitions: Array<FakeViewTransition & { resolveFinished: () => void }> = []

    ;(document as any).startViewTransition = vi.fn((callback?: () => Promise<void>) => {
      let resolveFinished!: () => void
      const updateCallbackDone = Promise.resolve().then(() => callback?.())
      const t = {
        updateCallbackDone,
        ready: updateCallbackDone.then(() => {}),
        finished: new Promise<void>((resolve) => {
          resolveFinished = resolve
        }),
        skipTransition: () => {},
        resolveFinished,
      }
      startedTransitions.push(t)
      return t
    })

    const [show, setShow] = createSignal(true)
    render(() => (
      <Show when={show()}><AnimateView><div class="box" /></AnimateView></Show>
    ))

    // First transition starts immediately
    const first = startTransition(() => {
      calls.push('first')
      setShow(false)
    }, { types: ['a'] })
    expect(first).toBeDefined()
    expect(startedTransitions).toHaveLength(1)
    await (first as unknown as FakeViewTransition).updateCallbackDone

    // Two more calls during playback: queued, updates NOT run yet
    const second = startTransition(() => {
      calls.push('second')
      setShow(true)
    }, { types: ['b'] })
    const third = startTransition(() => {
      calls.push('third')
    }, { types: ['c'] })
    expect(second).toBeUndefined()
    expect(third).toBeUndefined()
    expect(startedTransitions).toHaveLength(1)
    expect(calls).toEqual(['first'])

    // Finish the first transition → the queue flushes as ONE batched transition
    startedTransitions[0].resolveFinished()
    await startedTransitions[0].finished
    await vi.waitFor(() => {
      expect(startedTransitions).toHaveLength(2)
    })
    expect(calls).toEqual(['first', 'second', 'third'])

    // The batched transition runs its participant with the merged types
    await vi.waitFor(() => {
      expect(mockAnimateViewLayers).toHaveBeenCalledTimes(2)
    })
    expect(mockAnimateViewLayers.mock.calls[0][3]).toEqual(['a'])
    expect(mockAnimateViewLayers.mock.calls[1][3]).toEqual(['b', 'c'])
    expect(mockAnimateViewLayers.mock.calls[1][1]).toBe('enter')

    startedTransitions[1].resolveFinished()
    await startedTransitions[1].finished
  })
})
