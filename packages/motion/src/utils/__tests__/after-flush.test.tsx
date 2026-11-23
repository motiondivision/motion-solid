import { afterEach, describe, expect, it } from 'vitest'
import { delay } from '@/shared/test'
import { OBSERVE, createSignal, flush, onCleanup } from 'solid-js'
import { cleanup, render } from '@solidjs/testing-library'
import { makeMotion } from '@/directive'
import { domMax } from '@/features/dom-max'
import { afterFlush } from '../after-flush'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('afterFlush', () => {
  it('runs after the pending flush, not before', async () => {
    const [count, setCount] = createSignal(0)
    const seen: number[] = []
    setCount(1)
    afterFlush(() => seen.push(count()))
    expect(seen).toEqual([])
    flush()
    await delay(10)
    expect(seen).toEqual([1])
  })

  it('is valid from a component body and an onCleanup without diagnostics', async () => {
    const cap = OBSERVE!.diagnostics.capture()
    const calls: string[] = []
    const { unmount } = render(() => {
      afterFlush(() => calls.push('body'))
      onCleanup(() => afterFlush(() => calls.push('cleanup')))
      return <div />
    })
    flush()
    unmount()
    flush()
    await delay(10)
    expect(calls).toEqual(['body', 'cleanup'])
    expect(cap.stop().map(e => `${e.code}: ${e.message}`)).toEqual([])
  })

  it('makeMotion with layout called from a component body emits no diagnostics', () => {
    const cap = OBSERVE!.diagnostics.capture()
    const el = document.createElement('div')
    document.body.appendChild(el)
    render(() => {
      makeMotion(el, { layout: true }, domMax)
      return <span />
    })
    flush()
    expect(cap.stop().map(e => `${e.code}: ${e.message}`)).toEqual([])
  })
})
