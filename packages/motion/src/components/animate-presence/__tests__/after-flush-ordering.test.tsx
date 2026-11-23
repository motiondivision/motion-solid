import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@solidjs/testing-library'
import { createExitSession } from '../exit-session'
import type { ExitSessionConfig } from '../exit-session'
import { AnimatePresenceContext } from '../presence'
import type { PresenceContext } from '../presence'
import { createPresence } from '../use-presence'
import { createPresenceContainer } from '../use-presence-container'
import { delay } from '@/shared/test'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

// These pin the "after the current removal pass" timing of the deferred work in the presence
// code. Each assertion fails if the deferral becomes synchronous.
describe('presence deferrals run after the current pass, not inside it', () => {
  it('exit-session: leaves with nothing to wait for join one batch', async () => {
    const onAllComplete = vi.fn()
    const config = {
      props: { mode: 'sync', anchorX: 'left' },
      getNonce: () => undefined,
      onAllComplete,
    } satisfies ExitSessionConfig
    const sessions = createExitSession(config)
    const a = document.createElement('div')
    const b = document.createElement('div')
    const doneA = vi.fn()
    const doneB = vi.fn()

    sessions.exit(a, doneA)
    sessions.exit(b, doneB)
    // Neither finished inside the pass that registered them.
    expect(doneA).not.toHaveBeenCalled()
    expect(doneB).not.toHaveBeenCalled()
    expect(onAllComplete).not.toHaveBeenCalled()

    await delay(10)
    expect(doneA).toHaveBeenCalledTimes(1)
    expect(doneB).toHaveBeenCalledTimes(1)
    // One batch, one completion, rather than one per leaf.
    expect(onAllComplete).toHaveBeenCalledTimes(1)
  })

  it('createPresence: the handler stays registered until the removal pass has run', async () => {
    const registerHandler = vi.fn()
    const unregisterHandler = vi.fn()
    const ctx: PresenceContext = { registerHandler, unregisterHandler }
    function Child() {
      createPresence({ element: () => undefined })
      return null
    }
    const { unmount } = render(() => (
      <AnimatePresenceContext value={ctx}><Child /></AnimatePresenceContext>
    ))
    await delay(10)
    expect(registerHandler).toHaveBeenCalledTimes(1)

    unmount()
    expect(unregisterHandler).not.toHaveBeenCalled()
    await delay(10)
    expect(unregisterHandler).toHaveBeenCalledTimes(1)
    expect(unregisterHandler).toHaveBeenCalledWith(registerHandler.mock.calls[0][0])
  })

  it('propagate container: disposal is requested after, not during, owner cleanup', async () => {
    const disposeAfterExits = vi.fn()
    function Container() {
      const { session } = createPresenceContainer({ propagate: true, children: null } as any)
      session.disposeAfterExits = disposeAfterExits
      return null
    }
    const { unmount } = render(() => <Container />)
    unmount()
    expect(disposeAfterExits).not.toHaveBeenCalled()
    await delay(10)
    expect(disposeAfterExits).toHaveBeenCalledTimes(1)
  })
})
