import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@solidjs/testing-library'
import { Motion } from '@/components/motion'
import { delay } from '@/shared/test'

/**
 * Mock :focus-visible on an element: jsdom returns false for it on programmatic
 * focus, while keyboard-triggered focus matches in real browsers.
 */
function mockFocusVisible(el: Element) {
  const origMatches = el.matches.bind(el)
  el.matches = ((selector: string) =>
    selector === ':focus-visible' ? true : origMatches(selector)) as typeof el.matches
}

describe('focus behavior', () => {
  it('should trigger whileFocus when element receives focus', async () => {
    const { getByTestId } = render(() => (
      <Motion
        data-testid="motion"
        whileFocus={{ scale: 1.2, boxShadow: '0 0 0 2px #ff0088' }}
        transition={{ duration: 0 }}
      />
    ))
    const el = getByTestId('motion')
    mockFocusVisible(el)
    await fireEvent.focus(el)
    await delay(50)
    expect(el.style.transform).toBe('scale(1.2)')
    expect(el.style.boxShadow).toBe('0 0 0 2px #ff0088')
    await fireEvent.blur(el)
    await delay(50)
    expect(el.style.transform).toBe('none')
    expect(el.style.boxShadow).not.toBe('0 0 0 2px #ff0088')
  })
})
