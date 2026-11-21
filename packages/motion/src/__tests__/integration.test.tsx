import { describe, expect, it } from 'vitest'
import { For, Show, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  Reorder,
  createMotionValue,
  createTransform,
  createCycle,
  motion,
  useMotionConfig,
} from '@/index'
import * as api from '@/index'
import { delay } from '@/shared/test'
import { press, renderGroup, order } from '@/components/reorder/__tests__/helpers'

// jsdom reports offsetParent === null, which AnimationFeature treats as hidden.
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.isConnected ? document.body : null
  },
})

describe('public entry integration', () => {
  it('exports create* primitives and no use* hooks', () => {
    const names = Object.keys(api)
    expect(names.filter(n => /^use(?!.*Context$|MotionConfig$)/.test(n))).toEqual([])
    for (const n of ['createMotionValue', 'createTransform', 'createCycle', 'createPresence', 'createDragControls', 'createLayoutGroup'])
      expect(names).toContain(n)
    expect(names).not.toContain('MotionPlugin')
  })

  it('motion.div animates and propagates variants from parent to child', async () => {
    const variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    const { getByTestId } = render(() => (
      <motion.div data-testid="parent" initial="hidden" animate="visible" variants={variants} transition={{ duration: 0.05 }}>
        <motion.div data-testid="child" variants={variants} transition={{ duration: 0.05 }} />
      </motion.div>
    ))
    expect(getByTestId('child').style.opacity).toBe('0')
    await delay(300)
    expect(getByTestId('parent').style.opacity).toBe('1')
    expect(getByTestId('child').style.opacity).toBe('1')
  })

  it('AnimatePresence removes an element after its exit', async () => {
    const [show, setShow] = createSignal(true)
    const { container } = render(() => (
      <AnimatePresence>
        <Show when={show()}>
          <motion.div class="box" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.05 }} />
        </Show>
      </AnimatePresence>
    ))
    await delay(30)
    expect(container.querySelector('.box')).not.toBeNull()
    setShow(false)
    flush()
    await delay(400)
    expect(container.querySelector('.box')).toBeNull()
  })

  it('Reorder.Group reorders through the keyboard', async () => {
    const { container, onReorder } = await renderGroup()
    const a = container.querySelector('[data-testid=a]') as HTMLElement
    await press(a, ' ')
    await press(a, 'ArrowDown')
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'a', 'c'], 'a')
    expect(order(container)).toEqual(['b', 'a', 'c'])
    expect(typeof Reorder.Item).toBe('function')
  })

  it('createMotionValue and createTransform drive a style', async () => {
    let x!: ReturnType<typeof createMotionValue<number>>
    const { container } = render(() => {
      x = createMotionValue(0)
      const opacity = createTransform(x, [0, 100], [0, 1])
      return <motion.div style={{ x, opacity }} />
    })
    x.set(50)
    await delay(60)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.opacity).toBe('0.5')
    expect(el.style.transform).toContain('translateX(50px)')
  })

  it('createCycle cycles through items', () => {
    const [v, cycle] = createCycle('a', 'b', 'c')
    expect(v()).toBe('a')
    cycle()
    flush()
    expect(v()).toBe('b')
    cycle(0)
    flush()
    expect(v()).toBe('a')
  })

  it('MotionConfig transition is inherited and overridden', () => {
    let outer: any, inner: any
    function Read(props: { set: (c: any) => void }) {
      const config = useMotionConfig()
      props.set(config)
      return null
    }
    render(() => (
      <MotionConfig transition={{ duration: 1 }}>
        <Read set={c => (outer = c)} />
        <MotionConfig reducedMotion="always">
          <Read set={c => (inner = c)} />
        </MotionConfig>
      </MotionConfig>
    ))
    expect(inner().transition).toEqual({ duration: 1 })
    expect(inner().reducedMotion).toBe('always')
    expect(outer().reducedMotion).not.toBe('always')
  })

  it('LayoutGroup renders layoutId children', () => {
    const { getByTestId } = render(() => (
      <LayoutGroup id="g">
        <motion.div data-testid="a" layoutId="box" />
        <For each={[1]}>{() => <motion.div data-testid="b" layoutId="other" />}</For>
      </LayoutGroup>
    ))
    expect(getByTestId('a')).toBeTruthy()
    expect(getByTestId('b')).toBeTruthy()
  })
})
