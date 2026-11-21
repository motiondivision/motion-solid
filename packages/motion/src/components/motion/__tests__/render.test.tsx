import { describe, expect, it, vi } from 'vitest'
import { Show, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'motion-dom'
import { Motion, motion } from '@/components/motion'
import { m } from '@/components/motion/m'
import { mountedStates } from '@/state'
import { delay } from '@/shared/test'

describe('rendering', () => {
  it('renders any tag via the motion proxy and passes DOM props through', () => {
    const onClick = vi.fn()
    const { container } = render(() => (
      <motion.section id="s" class="c" data-x="1" aria-label="hi" onClick={onClick}>
        <motion.span>text</motion.span>
      </motion.section>
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName).toBe('SECTION')
    expect(el.id).toBe('s')
    expect(el.className).toBe('c')
    expect(el.dataset.x).toBe('1')
    expect(el.getAttribute('aria-label')).toBe('hi')
    expect(el.querySelector('span')!.textContent).toBe('text')
    el.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not leak motion props onto the element', () => {
    const { container } = render(() => (
      <Motion
        animate={{ x: 1 }}
        initial={false}
        whileHover={{ x: 2 }}
        variants={{ a: {} }}
        layout
        drag
        transition={{ duration: 1 }}
        custom={1}
      />
    ))
    const el = container.firstElementChild!
    for (const attr of ['animate', 'initial', 'whilehover', 'variants', 'layout', 'drag', 'transition', 'custom'])
      expect(el.hasAttribute(attr)).toBe(false)
  })

  it('renders `as` (reactive) and follows changes', () => {
    const [tag, setTag] = createSignal<string>('section')
    const { container } = render(() => <Motion as={tag()} id="x">hi</Motion>)
    expect(container.firstElementChild!.tagName).toBe('SECTION')
    setTag('article')
    flush()
    expect(container.firstElementChild!.tagName).toBe('ARTICLE')
    expect(container.firstElementChild!.textContent).toBe('hi')
  })

  it('does not give children to self-closing tags', () => {
    const { container } = render(() => (
      <>
        <motion.input data-testid="i" value="v">child</motion.input>
        <motion.img data-testid="img" src="a.png">child</motion.img>
      </>
    ))
    expect(container.querySelector('input')!.childNodes.length).toBe(0)
    expect(container.querySelector('img')!.childNodes.length).toBe(0)
  })

  it('forwards the ref (callback, variable and array forms) and exposes the element', () => {
    let direct: HTMLElement | undefined
    let a: HTMLElement | undefined
    let b: HTMLElement | undefined
    const { container } = render(() => (
      <>
        <Motion ref={(el: HTMLElement) => { direct = el }} id="one" />
        <Motion ref={[(el: HTMLElement) => { a = el }, (el: HTMLElement) => { b = el }]} id="two" />
      </>
    ))
    expect(direct).toBe(container.querySelector('#one'))
    expect(a).toBe(container.querySelector('#two'))
    expect(b).toBe(a)
  })

  it('mounts the state on the real element and unmounts it on removal', async () => {
    const [show, setShow] = createSignal(true)
    const { container } = render(() => (
      <Show when={show()}>
        <Motion id="gone" animate={{ opacity: 0.5 }} />
      </Show>
    ))
    const el = container.querySelector('#gone') as HTMLElement
    expect(mountedStates.get(el)).toBeDefined()
    expect(mountedStates.get(el)!.element).toBe(el)
    setShow(false)
    flush()
    await delay(20)
    expect(mountedStates.get(el)).toBeUndefined()
  })

  it('renders the fx marker attribute for true and bare, never otherwise', () => {
    const [fx, setFx] = createSignal<boolean | '' | undefined>(undefined)
    const { container } = render(() => <Motion fx={fx() as boolean | undefined} />)
    const el = container.firstElementChild!
    expect(el.hasAttribute('fx')).toBe(false)
    for (const [value, expected] of [[true, true], [false, false], ['', true], [undefined, false], [true, true], [false, false]] as const) {
      setFx(value)
      flush()
      expect(el.getAttribute('fx')).toBe(expected ? '' : null)
    }
  })

  it('computes initial style from initial values and user style', () => {
    const opacity = motionValue(0.3)
    const { container } = render(() => (
      <Motion initial={{ x: 12, backgroundColor: '#ff0000' }} style={{ opacity, color: 'blue' }} />
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.style.transform).toBe('translateX(12px)')
    expect(el.style.opacity).toBe('0.3')
    expect(el.style.color).toBe('blue')
    expect(el.getAttribute('style')).toContain('background-color')
  })

  it('applies user style changes without resetting what animation wrote', async () => {
    const [color, setColor] = createSignal('blue')
    const x = motionValue(0)
    const { container } = render(() => (
      <Motion animate={{ x: 50 }} transition={{ duration: 0.01 }} style={{ x, color: color() }} />
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.style.color).toBe('blue')
    await delay(100)
    expect(el.style.transform).toBe('translateX(50px)')
    setColor('red')
    flush()
    await delay(20)
    expect(el.style.color).toBe('red')
    expect(el.style.transform).toBe('translateX(50px)')
    // a motion value write after the style change still reaches the element
    x.set(70)
    await delay(50)
    expect(el.style.transform).toBe('translateX(70px)')
  })

  it('applies drag touch styles', () => {
    // jsdom's CSSStyleDeclaration drops touch-action, so record what is written to it
    const written: Record<string, string> = {}
    const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty').mockImplementation(function (this: CSSStyleDeclaration, name: string, value: string | null) {
      written[name] = String(value)
    })
    render(() => <Motion drag="x" />)
    setProperty.mockRestore()
    expect(written['touch-action']).toBe('pan-y')
    expect(written['user-select']).toBe('none')
  })

  it('animates a mounted element again when props change, via the motion value', async () => {
    const x = motionValue(0)
    const [target, setTarget] = createSignal(10)
    const { container } = render(() => <Motion style={{ x }} animate={{ x: target() }} transition={{ type: false }} />)
    const el = container.firstElementChild as HTMLElement
    await delay(30)
    expect(el.style.transform).toBe('translateX(10px)')
    setTarget(25)
    flush()
    await delay(30)
    expect(el.style.transform).toBe('translateX(25px)')
  })

  it('motion.create wraps a component and hands it the ref and style', async () => {
    function Box(props: { label: string, ref?: any, style?: any, class?: string }) {
      return <section ref={props.ref} style={props.style} class={props.class}>{props.label}</section>
    }
    const MotionBox = motion.create(Box)
    const onComplete = vi.fn()
    const { container } = render(() => (
      <MotionBox label="boxed" class="box" initial={{ opacity: 0.2 }} animate={{ opacity: 0.8 }} transition={{ duration: 0.01 }} onAnimationComplete={onComplete} />
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.tagName).toBe('SECTION')
    expect(el.textContent).toBe('boxed')
    expect(el.className).toBe('box')
    expect(el.style.opacity).toBe('0.2')
    await delay(100)
    expect(el.style.opacity).toBe('0.8')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('forwards motion props to a wrapped component only when asked', () => {
    const seen: Record<string, any>[] = []
    function Probe(props: any) {
      seen.push({ ...props })
      return <div ref={props.ref} />
    }
    render(() => {
      const Plain = motion.create(Probe)
      const Forwarding = motion.create(Probe, { forwardMotionProps: true })
      return (
        <>
          <Plain animate={{ x: 1 }} id="a" />
          <Forwarding animate={{ x: 1 }} id="b" />
        </>
      )
    })
    expect(seen[0].animate).toBeUndefined()
    expect(seen[0].id).toBe('a')
    expect(seen[1].animate).toEqual({ x: 1 })
    expect(seen[1].id).toBe('b')
  })

  it('caches string components', () => {
    expect(motion.div).toBe(motion.div)
    expect(m.div).toBe(m.div)
    expect(m.div).not.toBe(motion.div)
  })
})
