import { createSignal, onSettled } from 'solid-js'
import {
  MotionGlobalConfig,
  animate,
  hasReducedMotionListener,
  initPrefersReducedMotion,
  isDragActive,
  isDragging,
  motionValue,
  motion,
  prefersReducedMotion,
  setDragLock,
  supportsBrowserAnimation,
  supportsFlags,
  supportsLinearEasing,
  supportsPartialKeyframes,
  supportsScrollTimeline,
  supportsViewTimeline,
  supportsWaapi,
} from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-capabilities',
  title: 'Capabilities, feature flags, global config, drag lock',
  group: 'reference',
  description:
    'Shows what this browser supports (WAAPI, scroll/view timelines, linear() easing, partial keyframes) and whether supportsBrowserAnimation would accelerate a given property. Override a support check through supportsFlags, flip MotionGlobalConfig.instantAnimations, read prefersReducedMotion, and take the global drag lock while dragging a box (isDragActive, isDragging).',
  covers: [
    'MotionGlobalConfig',
    'hasReducedMotionListener',
    'initPrefersReducedMotion',
    'isDragActive',
    'isDragging',
    'prefersReducedMotion',
    'setDragLock',
    'supportsBrowserAnimation',
    'supportsFlags',
    'supportsLinearEasing',
    'supportsPartialKeyframes',
    'supportsScrollTimeline',
    'supportsViewTimeline',
    'supportsWaapi',
  ],
} as const

const FLAGS = ['scrollTimeline', 'viewTimeline', 'linearEasing'] as const

export default function Demo() {
  const [tick, setTick] = createSignal(0)
  const refresh = () => setTick(n => n + 1)
  const [attached, setAttached] = createSignal(false)
  const [lockInfo, setLockInfo] = createSignal('no lock')
  const [dragInfo, setDragInfo] = createSignal('idle')
  const [instant, setInstant] = createSignal(false)
  let host!: HTMLDivElement
  let instantBox!: HTMLDivElement
  let releaseLock: (() => void) | null = null

  onSettled(() => {
    setAttached(true)
    return () => {
      // Leave no override behind for other demos.
      for (const key of FLAGS) delete supportsFlags[key]
      MotionGlobalConfig.instantAnimations = false
      releaseLock?.()
    }
  })

  const cycleFlag = (key: (typeof FLAGS)[number]) => {
    const current = supportsFlags[key]
    if (current === undefined) supportsFlags[key] = false
    else if (current === false) supportsFlags[key] = true
    else delete supportsFlags[key]
    refresh()
  }

  const canAccelerate = (name: string, type?: string) => {
    tick()
    if (!attached()) return 'n/a'
    const value = motionValue(0)
    ;(value as unknown as { owner: unknown }).owner = { current: host, getProps: () => ({}) }
    return String(supportsBrowserAnimation({ name, motionValue: value, keyframes: [0, 1], type } as never))
  }

  return (
    <>
      <h4>Support checks</h4>
      <Readout label="supportsWaapi()" value={(tick(), String(supportsWaapi()))} />
      <Readout label="supportsScrollTimeline()" value={(tick(), String(supportsScrollTimeline()))} />
      <Readout label="supportsViewTimeline()" value={(tick(), String(supportsViewTimeline()))} />
      <Readout label="supportsLinearEasing()" value={(tick(), String(supportsLinearEasing()))} />
      <Readout label="supportsPartialKeyframes()" value={(tick(), String(supportsPartialKeyframes()))} />
      <Controls>
        {FLAGS.map(key => (
          <Button onClick={() => cycleFlag(key)}>supportsFlags.{key}: {(tick(), String(supportsFlags[key]))}</Button>
        ))}
        <Button
          onClick={() => {
            for (const key of FLAGS) delete supportsFlags[key]
            refresh()
          }}
        >
          clear flags
        </Button>
      </Controls>
      <div ref={host} style={{ height: '1px' }} />
      <Readout label="supportsBrowserAnimation opacity" value={canAccelerate('opacity')} />
      <Readout label="supportsBrowserAnimation transform" value={canAccelerate('transform')} />
      <Readout label="supportsBrowserAnimation backgroundColor" value={canAccelerate('backgroundColor')} />
      <Readout label="supportsBrowserAnimation width (never)" value={canAccelerate('width')} ok={canAccelerate('width') !== 'true'} />
      <Readout label="supportsBrowserAnimation opacity + inertia" value={canAccelerate('opacity', 'inertia')} ok={canAccelerate('opacity', 'inertia') !== 'true'} />

      <h4>Reduced motion state and MotionGlobalConfig</h4>
      <Controls>
        <Button onClick={() => { initPrefersReducedMotion(); refresh() }}>initPrefersReducedMotion()</Button>
        <Button
          pressed={instant()}
          onClick={() => {
            const next = !instant()
            MotionGlobalConfig.instantAnimations = next
            setInstant(next)
            refresh()
            animate(instantBox, { x: next ? 140 : 0 }, { duration: 2 })
          }}
        >
          MotionGlobalConfig.instantAnimations (2s animation becomes instant)
        </Button>
      </Controls>
      <Readout label="prefersReducedMotion.current" value={(tick(), String(prefersReducedMotion.current))} />
      <Readout label="hasReducedMotionListener.current" value={(tick(), String(hasReducedMotionListener.current))} />
      <Readout label="MotionGlobalConfig" value={(tick(), JSON.stringify({ skipAnimations: MotionGlobalConfig.skipAnimations ?? false, instantAnimations: MotionGlobalConfig.instantAnimations ?? false, useManualTiming: MotionGlobalConfig.useManualTiming ?? false }))} />
      <Stage height="50px">
        <div ref={instantBox} data-testid="instant-box" class="box" style={{ width: '30px', height: '30px' }} />
      </Stage>

      <h4>Drag lock</h4>
      <Controls>
        <Button
          onClick={() => {
            releaseLock?.()
            releaseLock = setDragLock('x')
            setLockInfo(releaseLock ? 'x lock taken' : 'lock refused')
          }}
        >
          setDragLock('x')
        </Button>
        <Button
          onClick={() => {
            const second = setDragLock('x')
            setLockInfo(`second lock (x) while x held: ${second ? 'granted' : 'refused'}`)
            second?.()
          }}
        >
          try x lock again
        </Button>
        <Button onClick={() => { releaseLock?.(); releaseLock = null; setLockInfo('released') }}>release</Button>
      </Controls>
      <Readout label="lock" value={lockInfo()} />
      <Readout label="drag" value={dragInfo()} />
      <Stage height="120px">
        <motion.div
          data-testid="drag-box"
          class="box"
          drag
          dragSnapToOrigin
          style={{ width: '60px', height: '60px' }}
          onDragStart={() => setDragInfo(`start: isDragActive=${isDragActive()} isDragging=${JSON.stringify(isDragging)}`)}
          onDragEnd={() => setDragInfo(`end: isDragActive=${isDragActive()} isDragging=${JSON.stringify(isDragging)}`)}
        />
      </Stage>
    </>
  )
}
