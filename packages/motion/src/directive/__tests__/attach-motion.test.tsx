import { describe, expect, it } from 'vitest'
import { createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { MotionConfig } from '@/components/motion-config'
import { createAttachMotion, createPresetMotion, getMotionSSRStyle, attachMotion } from '@/directive'
import { domAnimation } from '@/features/dom-animation'
import { mountedStates } from '@/state'
import { delay } from '@/shared/test'

function Box(props: { ref: any }) {
  return <div data-testid="box" ref={props.ref} />
}

describe('attachMotion, createAttachMotion and createPresetMotion', () => {
  it('applies initial styles to element', () => {
    const { getByTestId } = render(() => <Box ref={attachMotion({ initial: { opacity: 0.5, y: 20 } })} />)
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('0.5')
    expect(el.style.transform).toContain('translateY(20px)')
  })

  it('animates from initial to animate', async () => {
    const { getByTestId } = render(() => (
      <Box ref={attachMotion({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.05 } })} />
    ))
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('0')
    await delay(200)
    expect(Number(el.style.opacity)).toBe(1)
  })

  it('updates state when an accessor of options changes', async () => {
    const [x, setX] = createSignal(0)
    const { getByTestId } = render(() => (
      <Box ref={attachMotion(() => ({ animate: { x: x() }, transition: { duration: 0.05 } }))} />
    ))
    const el = getByTestId('box')
    setX(100)
    flush()
    await delay(200)
    expect(el.style.transform).toContain('translateX(100px)')
  })

  it('works inside a ref array', () => {
    let seen: HTMLElement | undefined
    const { getByTestId } = render(() => (
      <Box ref={[(el: HTMLElement) => { seen = el }, attachMotion({ initial: { opacity: 0.6 } })]} />
    ))
    expect(seen).toBe(getByTestId('box'))
    expect(seen!.style.opacity).toBe('0.6')
  })

  it('mounts a state and unmounts it on dispose', async () => {
    const { getByTestId, unmount } = render(() => <Box ref={attachMotion({ initial: { opacity: 1 } })} />)
    const el = getByTestId('box')
    const state = mountedStates.get(el)
    expect(state?.isMounted()).toBe(true)
    unmount()
    await delay(10)
    expect(state?.isMounted()).toBe(false)
    expect(mountedStates.get(el)).toBeUndefined()
  })

  it('works with createAttachMotion using the domAnimation bundle', () => {
    const attach = createAttachMotion(domAnimation)
    const { getByTestId } = render(() => <Box ref={attach({ initial: { opacity: 0.3 } })} />)
    expect(getByTestId('box').style.opacity).toBe('0.3')
  })

  it('works with createAttachMotion without bundle', () => {
    const attach = createAttachMotion()
    const { getByTestId } = render(() => <Box ref={attach({ initial: { opacity: 0.7 } })} />)
    expect(getByTestId('box').style.opacity).toBe('0.7')
  })

  it('applies variant-based initial and animate', async () => {
    const { getByTestId } = render(() => (
      <Box
        ref={attachMotion({
          initial: 'hidden',
          animate: 'visible',
          variants: { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0 } },
          transition: { duration: 0.05 },
        })}
      />
    ))
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('0')
    expect(el.style.transform).toContain('translateX(-50px)')
    await delay(200)
    expect(Number(el.style.opacity)).toBe(1)
  })

  it('starts at animate values under MotionConfig skipAnimations', () => {
    const { getByTestId } = render(() => (
      <MotionConfig skipAnimations>
        <Box
          ref={attachMotion({
            initial: { opacity: 0, x: -50 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 10 },
          })}
        />
      </MotionConfig>
    ))
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('1')
    expect(el.style.transform).toBe('none')
  })

  it('accepts whileHover and the other motion props', () => {
    const { getByTestId } = render(() => <Box ref={attachMotion({ whileHover: { scale: 1.2 } })} />)
    expect(mountedStates.get(getByTestId('box'))?.options.whileHover).toEqual({ scale: 1.2 })
  })

  it('applies SVG attributes for svg elements', () => {
    const { container } = render(() => (
      <svg><circle ref={attachMotion({ initial: { opacity: 0.5 } })} /></svg>
    ))
    expect((container.querySelector('circle') as SVGElement).style.opacity).toBe('0.5')
  })

  it('does not set motion props as attributes', () => {
    const { getByTestId } = render(() => <Box ref={attachMotion({ initial: { opacity: 0 } })} />)
    expect(getByTestId('box').hasAttribute('initial')).toBe(false)
  })

  it('does not inherit or provide parent variants', () => {
    const { getByTestId } = render(() => (
      <div ref={attachMotion({ variants: { v: { opacity: 0.2 } }, animate: 'v', initial: 'v' })}>
        <Box ref={attachMotion({ initial: 'v', variants: { v: { opacity: 0.9 } } })} />
      </div>
    ))
    expect(getByTestId('box').style.opacity).toBe('0.9')
  })
})

describe('getMotionSSRStyle', () => {
  it('returns initial styles', () => {
    const result = getMotionSSRStyle({ initial: { opacity: 0, y: 20 } })
    expect(result).toHaveProperty('opacity', 0)
    expect(result).toHaveProperty('transform')
  })

  it('resolves variant-based initial', () => {
    const result = getMotionSSRStyle({
      initial: 'hidden',
      variants: { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0 } },
    })
    expect(result).toHaveProperty('opacity', 0)
  })

  it('resolves animate values when initial is false', () => {
    expect(getMotionSSRStyle({ initial: false, animate: { opacity: 0.8, y: 10 } })).toHaveProperty('opacity', 0.8)
  })

  it('returns null when there is no initial or animate', () => {
    expect(getMotionSSRStyle({})).toBeNull()
  })
})

describe('createPresetMotion', () => {
  it('applies preset defaults', async () => {
    const fadeIn = createPresetMotion({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.05 },
    })
    const { getByTestId } = render(() => <Box ref={fadeIn()} />)
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('0')
    await delay(200)
    expect(Number(el.style.opacity)).toBe(1)
  })

  it('options at the use site override preset defaults', () => {
    const fadeIn = createPresetMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })
    const { getByTestId } = render(() => <Box ref={fadeIn({ initial: { opacity: 0.3 } })} />)
    expect(getByTestId('box').style.opacity).toBe('0.3')
  })

  it('works with a custom feature bundle', () => {
    const fadeIn = createPresetMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } }, domAnimation)
    const { getByTestId } = render(() => <Box ref={fadeIn()} />)
    expect(getByTestId('box').style.opacity).toBe('0')
  })

  it('preset with transform values', async () => {
    const slideUp = createPresetMotion({
      initial: { opacity: 0, y: 40 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.05 },
    })
    const { getByTestId } = render(() => <Box ref={slideUp()} />)
    const el = getByTestId('box')
    expect(el.style.opacity).toBe('0')
    expect(el.style.transform).toContain('translateY(40px)')
    await delay(200)
    expect(Number(el.style.opacity)).toBe(1)
  })

  it('SSR style merges the preset with user options', () => {
    const preset = { initial: { opacity: 0 }, animate: { opacity: 1 } }
    expect(getMotionSSRStyle({ ...preset, initial: { opacity: 0.5, y: 10 } })).toHaveProperty('opacity', 0.5)
  })

  it('cleans up on dispose', async () => {
    const fadeIn = createPresetMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })
    const { getByTestId, unmount } = render(() => <Box ref={fadeIn()} />)
    const state = mountedStates.get(getByTestId('box'))
    unmount()
    await delay(10)
    expect(state?.isMounted()).toBe(false)
  })
})

describe('attachMotion CSS property names', () => {
  it('getMotionSSRStyle returns dash-case keys and keeps custom properties', () => {
    const result = getMotionSSRStyle({
      initial: { backgroundColor: 'red', '--x': 7 } as any,
      style: { borderRadius: 4 } as any,
    })!
    expect(result).toHaveProperty('background-color', 'red')
    expect(result).toHaveProperty('border-radius')
    expect(result).toHaveProperty('--x')
    expect(result).not.toHaveProperty('backgroundColor')
    expect(result).not.toHaveProperty('borderRadius')
  })

  it('applies initial custom properties to the element', () => {
    const { getByTestId } = render(() => (
      <Box ref={attachMotion({ initial: { '--x': 7, opacity: 0.5 } as any })} />
    ))
    expect(getByTestId('box').style.getPropertyValue('--x')).toBe('7')
  })
})
