import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@solidjs/testing-library'
import { Motion } from '@/components/motion'
import { delay } from '@/shared/test'

describe('gestures drive the DOM', () => {
  it('whileHover applies and reverts', async () => {
    const onHoverStart = vi.fn()
    const onHoverEnd = vi.fn()
    const { getByTestId } = render(() => (
      <Motion
        data-testid="el"
        whileHover={{ opacity: 0.5 }}
        transition={{ duration: 0 }}
        onHoverStart={onHoverStart}
        onHoverEnd={onHoverEnd}
      />
    ))
    const el = getByTestId('el')
    await fireEvent.pointerEnter(el, { pointerType: 'mouse' })
    await delay(50)
    expect(el.style.opacity).toBe('0.5')
    expect(onHoverStart).toHaveBeenCalledTimes(1)
    await fireEvent.pointerLeave(el, { pointerType: 'mouse' })
    await delay(50)
    expect(el.style.opacity).not.toBe('0.5')
    expect(onHoverEnd).toHaveBeenCalledTimes(1)
  })

  it('whilePress applies on pointer down and reverts after pointer up, and fires onPress', async () => {
    const onPress = vi.fn()
    const { getByTestId } = render(() => (
      <Motion data-testid="el" whilePress={{ scale: 0.5 }} transition={{ duration: 0 }} onPress={onPress} />
    ))
    const el = getByTestId('el')
    await fireEvent.pointerDown(el, { isPrimary: true, pointerType: 'mouse' })
    await delay(50)
    expect(el.style.transform).toBe('scale(0.5)')
    await fireEvent.pointerUp(el, { isPrimary: true, pointerType: 'mouse' })
    await delay(50)
    expect(el.style.transform).toBe('none')
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('accepts React-named whileTap and onTap', async () => {
    const onTap = vi.fn()
    const { getByTestId } = render(() => (
      <Motion data-testid="el" whileTap={{ scale: 0.25 }} transition={{ duration: 0 }} onTap={onTap} />
    ))
    const el = getByTestId('el')
    // the React aliases are consumed, never rendered as attributes
    expect(el.hasAttribute('whiletap')).toBe(false)
    expect(el.hasAttribute('ontap')).toBe(false)
    await fireEvent.pointerDown(el, { isPrimary: true, pointerType: 'mouse' })
    await delay(50)
    expect(el.style.transform).toBe('scale(0.25)')
    await fireEvent.pointerUp(el, { isPrimary: true, pointerType: 'mouse' })
    await delay(50)
    expect(onTap).toHaveBeenCalledTimes(1)
  })
})
