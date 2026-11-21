import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, createSignal, flush } from 'solid-js'
import { render } from '@solidjs/web'
import { createScroll } from '../use-scroll'
import type { CreateScrollOptions } from '../use-scroll'
import { delay } from '@/shared/test'

const mockCleanup = vi.fn<() => void>()
const mockScroll = vi.fn<(callback: (...args: any[]) => any, options?: any) => () => void>(() => mockCleanup)

vi.mock('framer-motion/dom', () => ({
  scroll: (...args: any[]) => mockScroll(...(args as [callback: (...args: any[]) => any, options?: any])),
}))

vi.mock('motion-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion-dom')>()
  return {
    ...actual,
    supportsScrollTimeline: vi.fn(() => false),
    supportsViewTimeline: vi.fn(() => false),
  }
})

function setup(options?: CreateScrollOptions | (() => CreateScrollOptions)) {
  let values!: ReturnType<typeof createScroll>
  const dispose = createRoot((dispose) => {
    values = createScroll(options)
    return dispose
  })
  flush()
  return { values, dispose }
}

describe('createScroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the scroll motion values at 0', () => {
    const { values, dispose } = setup()
    expect(values.scrollX.get()).toBe(0)
    expect(values.scrollY.get()).toBe(0)
    expect(values.scrollXProgress.get()).toBe(0)
    expect(values.scrollYProgress.get()).toBe(0)
    expect(values.scrollXLength.get()).toBe(0)
    expect(values.scrollYLength.get()).toBe(0)
    dispose()
  })

  it('calls scroll with default options when none are provided', () => {
    const { dispose } = setup()
    expect(mockScroll).toHaveBeenCalledTimes(1)
    const [, options] = mockScroll.mock.calls[0]
    expect(options.axis).toBeUndefined()
    expect(options.offset).toBeUndefined()
    expect(options.container).toBeUndefined()
    expect(options.target).toBeUndefined()
    dispose()
  })

  it('does not start before the owner has flushed (effects run after setup)', () => {
    const dispose = createRoot((dispose) => {
      createScroll()
      return dispose
    })
    expect(mockScroll).not.toHaveBeenCalled()
    flush()
    expect(mockScroll).toHaveBeenCalledTimes(1)
    dispose()
  })

  it('passes a static axis, offset and trackContentSize', () => {
    const offset = ['start end', 'end start'] as any
    const { dispose } = setup({ axis: 'x', offset, trackContentSize: true })
    const [, options] = mockScroll.mock.calls[0]
    expect(options.axis).toBe('x')
    expect(options.offset).toEqual(offset)
    expect(options.trackContentSize).toBe(true)
    dispose()
  })

  it('re-subscribes when an options accessor changes', () => {
    const [axis, setAxis] = createSignal<'x' | 'y'>('x')
    const { dispose } = setup(() => ({ axis: axis() }))

    expect(mockScroll).toHaveBeenCalledTimes(1)
    expect(mockScroll.mock.calls[0][1].axis).toBe('x')

    setAxis('y')
    flush()

    expect(mockCleanup).toHaveBeenCalledTimes(1)
    expect(mockScroll).toHaveBeenCalledTimes(2)
    expect(mockScroll.mock.calls[1][1].axis).toBe('y')
    dispose()
  })

  it('re-subscribes when the offset changes', () => {
    const [offset, setOffset] = createSignal<any>(['start end', 'end start'])
    const { dispose } = setup(() => ({ offset: offset() }))
    expect(mockScroll).toHaveBeenCalledTimes(1)
    setOffset(['start start', 'end end'])
    flush()
    expect(mockCleanup).toHaveBeenCalled()
    expect(mockScroll).toHaveBeenCalledTimes(2)
    expect(mockScroll.mock.calls[1][1].offset).toEqual(['start start', 'end end'])
    dispose()
  })

  it('accepts elements directly', () => {
    const container = document.createElement('div')
    const target = document.createElement('span')
    const { dispose } = setup({ container, target })
    const [, options] = mockScroll.mock.calls[0]
    expect(options.container).toBe(container)
    expect(options.target).toBe(target)
    dispose()
  })

  it('resolves element accessors after mount (variable assigned in ref)', () => {
    let container: HTMLDivElement | undefined
    let target: HTMLDivElement | undefined
    const dispose = render(() => {
      createScroll({ container: () => container, target: () => target })
      return (
        <div ref={(el: HTMLDivElement) => { container = el }}>
          <div ref={(el: HTMLDivElement) => { target = el }} />
        </div>
      )
    }, document.createElement('div'))
    flush()

    expect(mockScroll).toHaveBeenCalledTimes(1)
    const [, options] = mockScroll.mock.calls[0]
    expect(options.container).toBeInstanceOf(HTMLDivElement)
    expect(options.target).toBeInstanceOf(HTMLDivElement)
    expect(options.container).toBe(container)
    expect(options.target).toBe(target)
    dispose()
  })

  it('resolves signal-backed refs and starts once they are set', () => {
    const [target, setTarget] = createSignal<HTMLDivElement>()
    const { dispose } = setup({ target })

    // Requested but not yet hydrated: must not fall back to tracking the window.
    expect(mockScroll).not.toHaveBeenCalled()

    const el = document.createElement('div')
    setTarget(el)
    flush()

    expect(mockScroll).toHaveBeenCalledTimes(1)
    expect(mockScroll.mock.calls[0][1].target).toBe(el)
    dispose()
  })

  it('retries once in a microtask when a ref is assigned late (plain variable)', async () => {
    let target: HTMLDivElement | undefined
    const { dispose } = setup({ target: () => target })
    expect(mockScroll).not.toHaveBeenCalled()

    target = document.createElement('div')
    await delay(20)

    expect(mockScroll).toHaveBeenCalledTimes(1)
    expect(mockScroll.mock.calls[0][1].target).toBe(target)
    dispose()
  })

  it('ignores an explicitly undefined container (window tracking)', () => {
    const { dispose } = setup({ container: undefined })
    expect(mockScroll).toHaveBeenCalledTimes(1)
    expect(mockScroll.mock.calls[0][1].container).toBeUndefined()
    dispose()
  })

  it('updates motion values from the scroll callback', () => {
    const { values, dispose } = setup()
    const callback = mockScroll.mock.calls[0][0]
    callback(0.5, {
      x: { current: 100, progress: 0.25, scrollLength: 10 },
      y: { current: 200, progress: 0.5, scrollLength: 20 },
    })

    expect(values.scrollX.get()).toBe(100)
    expect(values.scrollXProgress.get()).toBe(0.25)
    expect(values.scrollXLength.get()).toBe(10)
    expect(values.scrollY.get()).toBe(200)
    expect(values.scrollYProgress.get()).toBe(0.5)
    expect(values.scrollYLength.get()).toBe(20)
    dispose()
  })

  it('cleans up the scroll listener when the owner is disposed', () => {
    const { dispose } = setup()
    expect(mockCleanup).not.toHaveBeenCalled()
    dispose()
    expect(mockCleanup).toHaveBeenCalledTimes(1)
  })

  describe('scroll timeline acceleration', () => {
    it('sets accelerate on progress values when ScrollTimeline is supported (no target)', async () => {
      const { supportsScrollTimeline } = await import('motion-dom')
      vi.mocked(supportsScrollTimeline).mockReturnValue(true)
      const { values, dispose } = setup()

      expect(values.scrollXProgress.accelerate).toBeDefined()
      expect(values.scrollYProgress.accelerate).toBeDefined()
      expect(values.scrollX.accelerate).toBeUndefined()
      expect(values.scrollY.accelerate).toBeUndefined()
      dispose()
    })

    it('is set synchronously, before the first flush', async () => {
      const { supportsScrollTimeline } = await import('motion-dom')
      vi.mocked(supportsScrollTimeline).mockReturnValue(true)
      const { values, dispose } = createRoot(dispose => ({ values: createScroll(), dispose }))
      expect(values.scrollXProgress.accelerate).toBeDefined()
      dispose()
    })

    it('does not set accelerate when ScrollTimeline is not supported', async () => {
      const { supportsScrollTimeline } = await import('motion-dom')
      vi.mocked(supportsScrollTimeline).mockReturnValue(false)
      const { values, dispose } = setup()
      expect(values.scrollXProgress.accelerate).toBeUndefined()
      expect(values.scrollYProgress.accelerate).toBeUndefined()
      dispose()
    })

    it('sets accelerate when ViewTimeline is supported and target uses a recognised offset', async () => {
      const { supportsViewTimeline } = await import('motion-dom')
      vi.mocked(supportsViewTimeline).mockReturnValue(true)
      const [target] = createSignal<HTMLElement>()
      const { values, dispose } = setup({ target, offset: [[0, 1], [1, 1]] as any })
      expect(values.scrollXProgress.accelerate).toBeDefined()
      expect(values.scrollYProgress.accelerate).toBeDefined()
      dispose()
    })

    it('does not set accelerate when target uses an unrecognised offset', async () => {
      const { supportsViewTimeline } = await import('motion-dom')
      vi.mocked(supportsViewTimeline).mockReturnValue(true)
      const [target] = createSignal<HTMLElement>()
      const { values, dispose } = setup({ target, offset: ['start center', 'end start'] as any })
      expect(values.scrollXProgress.accelerate).toBeUndefined()
      expect(values.scrollYProgress.accelerate).toBeUndefined()
      dispose()
    })

    it('accelerate factory calls scroll with resolved options', async () => {
      const { supportsScrollTimeline } = await import('motion-dom')
      vi.mocked(supportsScrollTimeline).mockReturnValue(true)
      const { values, dispose } = setup({ axis: 'x' })
      mockScroll.mockClear()

      const mockAnimation = {} as any
      const stop = values.scrollXProgress.accelerate!.factory(mockAnimation)
      await delay(20)

      expect(mockScroll).toHaveBeenCalledWith(
        mockAnimation,
        expect.objectContaining({ axis: 'x' }),
      )
      stop()
      dispose()
    })

    it('accelerate factory waits for a pending ref instead of tracking the window', async () => {
      const { supportsViewTimeline } = await import('motion-dom')
      vi.mocked(supportsViewTimeline).mockReturnValue(true)
      const [target, setTarget] = createSignal<HTMLElement>()
      const { values, dispose } = setup({ target, offset: [[0, 1], [1, 1]] as any })
      mockScroll.mockClear()

      const stop = values.scrollYProgress.accelerate!.factory({} as any)
      await delay(20)
      expect(mockScroll).not.toHaveBeenCalled()

      const el = document.createElement('div')
      setTarget(el)
      flush()
      await delay(20)
      expect(mockScroll).toHaveBeenCalledTimes(1)
      expect(mockScroll.mock.calls[0][1].target).toBe(el)
      stop()
      dispose()
    })
  })
})
