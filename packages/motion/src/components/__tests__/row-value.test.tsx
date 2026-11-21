import { render } from '@solidjs/testing-library'
import { createSignal, flush } from 'solid-js'
import { motionValue } from 'motion-dom'
import { describe, expect, it, vi } from 'vitest'
import { RowValue } from '../RowValue'

describe('row-value', () => {
  it('renders the initial value', () => {
    const { container } = render(() => <RowValue value={motionValue(10)} />)
    expect(container.textContent).toBe('10')
  })

  it('updates when the value changes', () => {
    const value = motionValue('initial')
    const { container } = render(() => <RowValue value={value} />)
    expect(container.textContent).toBe('initial')

    value.set('updated')
    expect(container.textContent).toBe('updated')
  })

  it('cleans up its subscription on unmount', () => {
    const value = motionValue('test')
    const unsubscribe = vi.fn()
    vi.spyOn(value, 'on').mockImplementation(() => unsubscribe)

    const { unmount } = render(() => <RowValue value={value} />)
    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('handles different value types', () => {
    const number = render(() => <RowValue value={motionValue(42)} />)
    expect(number.container.textContent).toBe('42')
    const string = render(() => <RowValue value={motionValue('hello')} />)
    expect(string.container.textContent).toBe('hello')
    const bool = render(() => <RowValue value={motionValue(true)} />)
    expect(bool.container.textContent).toBe('true')
  })

  it('updates the DOM node directly, without re-rendering it', () => {
    const value = motionValue('initial')
    const { container } = render(() => <RowValue value={value} />)
    const node = container.firstChild!
    value.set('updated via DOM')
    expect(container.firstChild).toBe(node)
    expect(node.textContent).toBe('updated via DOM')
  })

  it('follows a different MotionValue when the prop changes', () => {
    const first = motionValue('one')
    const second = motionValue('two')
    const [value, setValue] = createSignal(first)
    const { container } = render(() => <RowValue value={value()} />)
    expect(container.textContent).toBe('one')

    setValue(second)
    flush()
    expect(container.textContent).toBe('two')

    first.set('stale')
    expect(container.textContent).toBe('two')
    second.set('live')
    expect(container.textContent).toBe('live')
  })
})
