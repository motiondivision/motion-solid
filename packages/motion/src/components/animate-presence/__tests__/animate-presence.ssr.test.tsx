// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { For, Show } from 'solid-js'
import { renderToString } from '@solidjs/web'
import { AnimatePresence } from '@/components/animate-presence'
import { Motion } from '@/components/motion'

describe('AnimatePresence on the server', () => {
  it('has no DOM globals in this environment', () => {
    expect(typeof Node).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  it('renders plain children', () => {
    const html = renderToString(() => (
      <AnimatePresence>
        <p class="plain">hello</p>
      </AnimatePresence>
    ))
    expect(html).toContain('<p')
    expect(html).toContain('hello')
  })

  it('renders children inside Show and For', () => {
    const html = renderToString(() => (
      <AnimatePresence>
        <Show when={true}><span>shown</span></Show>
        <For each={['a', 'b']}>{item => <i>{item}</i>}</For>
      </AnimatePresence>
    ))
    expect(html).toContain('shown')
    expect(html).toContain('>a<')
    expect(html).toContain('>b<')
  })

  it('renders primitive children', () => {
    const html = renderToString(() => <AnimatePresence>{'text'}{42}</AnimatePresence>)
    expect(html).toContain('text')
    expect(html).toContain('42')
  })

  it('renders each mode and the wrapper element', () => {
    for (const mode of ['sync', 'wait', 'popLayout'] as const) {
      const html = renderToString(() => (
        <AnimatePresence mode={mode} as="section"><b>{mode}</b></AnimatePresence>
      ))
      expect(html).toContain('<section')
      expect(html).toContain(`>${mode}<`)
    }
  })

  it('renders motion elements with their initial styles', () => {
    const html = renderToString(() => (
      <AnimatePresence>
        <Show when={true}>
          <Motion class="m" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>child</Motion>
        </Show>
      </AnimatePresence>
    ))
    expect(html).toContain('class="m"')
    expect(html).toContain('opacity:0')
    expect(html).toContain('translateX(20px)')
    expect(html).toContain('child')
  })

  it('renders animate values when initial is false', () => {
    const html = renderToString(() => (
      <AnimatePresence initial={false}>
        <Motion initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      </AnimatePresence>
    ))
    expect(html).toContain('opacity:1')
    expect(html).not.toContain('opacity:0')
  })
})
