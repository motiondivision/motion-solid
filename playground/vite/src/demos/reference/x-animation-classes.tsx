import { createSignal, onSettled } from 'solid-js'
import type { Accessor } from 'solid-js'
import {
  AsyncMotionValueAnimation,
  GroupAnimation,
  GroupAnimationWithThen,
  JSAnimation,
  NativeAnimation,
  addBuilderToScope,
  addToScope,
  activeScope,
  animate,
  animateMini,
  arc,
  animateMotionValue,
  animateSingleValue,
  animateValue,
  animationMapKey,
  attachFollow,
  attachSpring,
  bindToScope,
  createScopedAnimate,
  delay,
  followValue,
  getAnimationMap,
  mapValue,
  motionValue,
  resolveMotionValue,
  scopeMotion,
  springValue,
  startWaapiAnimation,
  transformValue,
} from 'motion-solid'
import * as library from 'motion-solid'
import type { MotionScope, MotionValue } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'x-animation-classes',
  title: 'Animation classes, MotionValue helpers and scopes',
  group: 'reference',
  description:
    'JSAnimation / animateValue / animateSingleValue / GroupAnimation(WithThen) driven by play, pause, seek and cancel buttons; animateMini and startWaapiAnimation producing NativeAnimation instances; delay(); a hand-built MotionValue feeding springValue, followValue, attachSpring, attachFollow, transformValue, mapValue and animateMotionValue; and a scopeMotion scope that collects cleanups (addToScope, bindToScope, addBuilderToScope, activeScope, createScopedAnimate).',
  covers: [
    'AsyncMotionValueAnimation',
    'GroupAnimation',
    'GroupAnimationWithThen',
    'JSAnimation',
    'MotionValue',
    'NativeAnimation',
    'activeScope',
    'addBuilderToScope',
    'addToScope',
    'animate',
    'animateMini',
    'arc',
    'animateMotionValue',
    'animateSingleValue',
    'animateValue',
    'animationMapKey',
    'attachFollow',
    'attachSpring',
    'bindToScope',
    'createScopedAnimate',
    'delay',
    'followValue',
    'getAnimationMap',
    'mapValue',
    'motionValue',
    'resolveMotionValue',
    'scopeMotion',
    'springValue',
    'startWaapiAnimation',
    'transformValue',
  ],
} as const

/** Live number from a MotionValue; unsubscribes on cleanup. */
function track(value: MotionValue<number>): Accessor<number> {
  const [read, write] = createSignal(value.get())
  onSettled(() => value.on('change', next => write(next)))
  return read
}

export default function Demo() {
  // --- JS animations
  const [jsValue, setJsValue] = createSignal(0)
  const [jsInfo, setJsInfo] = createSignal('idle')
  let js: JSAnimation<number> | undefined
  const startJs = (viaFunction: boolean) => {
    js?.stop()
    const options = { keyframes: [0, 100], duration: 2000, ease: 'linear' as const, onUpdate: (v: number) => setJsValue(v) }
    js = viaFunction ? animateValue(options) : new JSAnimation(options)
    setJsInfo(`${viaFunction ? 'animateValue' : 'new JSAnimation'}: instanceof JSAnimation = ${js instanceof JSAnimation}`)
  }
  const describeJs = () => setJsInfo(`state=${js?.state} time=${js?.time.toFixed(2)}s speed=${js?.speed}`)

  // --- group animations
  const [groupInfo, setGroupInfo] = createSignal('idle')
  const [groupA, setGroupA] = createSignal(0)
  const [groupB, setGroupB] = createSignal(0)
  let group: GroupAnimation | undefined
  const startGroup = (withThen: boolean) => {
    const a = animateValue({ keyframes: [0, 100], duration: 1500, ease: 'linear', onUpdate: setGroupA })
    const b = animateValue({ keyframes: [0, 50], duration: 1000, ease: 'linear', onUpdate: setGroupB })
    if (withThen) {
      const g = new GroupAnimationWithThen([a, b])
      group = g
      setGroupInfo('GroupAnimationWithThen running')
      g.then(() => setGroupInfo('GroupAnimationWithThen resolved (then)'))
    } else {
      group = new GroupAnimation([a, b])
      setGroupInfo('GroupAnimation running')
    }
  }

  // --- animateSingleValue + delay
  const single = motionValue(0)
  const singleNow = track(single)
  const [delayed, setDelayed] = createSignal('not started')
  let cancelDelay: VoidFunction | undefined

  // --- native animations
  let box!: HTMLDivElement
  const [nativeInfo, setNativeInfo] = createSignal('idle')
  const startMini = () => {
    const controls = animateMini(box, { opacity: [0.2, 1], transform: ['translateX(0px)', 'translateX(120px)'] }, { duration: 1 })
    const map = getAnimationMap(box)
    const first = (controls as unknown as { animations: unknown[] }).animations?.[0]
    setNativeInfo(`animateMini: ${(controls as unknown as { animations: unknown[] }).animations?.length} animations, first is NativeAnimation=${first instanceof NativeAnimation}; map keys=[${[...map.keys()].join(', ')}]; key("opacity")=${animationMapKey('opacity')}`)
  }
  const startArc = () => {
    animate(box, { x: [0, 200], y: [0, 40] }, { duration: 1, path: arc({ strength: 0.8, rotate: true }) })
    setNativeInfo('animate(box, { x, y }, { path: arc({ strength: 0.8, rotate: true }) }): the box follows a curved path')
  }
  const startWaapi = () => {
    const animation = startWaapiAnimation(box, 'opacity', [1, 0.3, 1], { duration: 0.8 } as never)
    setNativeInfo(`startWaapiAnimation: playState=${animation.playState}, effect target is box=${(animation.effect as KeyframeEffect).target === box}`)
  }

  // --- motion values
  const source = motionValue(0)
  const sourceNow = track(source)
  const spr = springValue(source, { stiffness: 200, damping: 20 })
  const sprNow = track(spr)
  const fol = followValue(source, { type: 'spring', stiffness: 80, damping: 10 })
  const folNow = track(fol)
  // `MotionValue` is exported as a type only by the typings, but the class exists at runtime.
  const MotionValueClass = (library as unknown as { MotionValue: new (init: number) => MotionValue<number> }).MotionValue
  const attachedSpring = new MotionValueClass(0)
  const attachedFollow = motionValue(0)
  onSettled(() => {
    const stopSpring = attachSpring(attachedSpring, source, { stiffness: 400, damping: 30 })
    const stopFollow = attachFollow(attachedFollow, source, { type: 'spring', stiffness: 50, damping: 8 })
    return () => {
      stopSpring()
      stopFollow()
    }
  })
  const attachedSpringNow = track(attachedSpring)
  const attachedFollowNow = track(attachedFollow)
  const doubled = transformValue(() => source.get() * 2)
  const doubledNow = track(doubled)
  const mapped = mapValue(source, [0, 100], ['0%', '100%'])
  const [mappedNow, setMappedNow] = createSignal(String(mapped.get()))
  onSettled(() => mapped.on('change', v => setMappedNow(String(v))))
  const [animMv, setAnimMv] = createSignal('idle')
  const animated = motionValue(0)
  const animatedNow = track(animated)
  const jump = (target: number) => source.set(target)

  // --- scopes
  const [scopeInfo, setScopeInfo] = createSignal('no scope')
  const [cleanups, setCleanups] = createSignal(0)
  const [scopeLog, setScopeLog] = createSignal('')
  let scope: MotionScope | undefined
  let scopedBox!: HTMLDivElement
  const startScope = () => {
    scope?.stop()
    const log: string[] = []
    scope = scopeMotion(() => {
      log.push(`activeScope.current inside setup = ${String(!!activeScope.current)}`)
      addToScope(() => setCleanups(n => n + 1))
      bindToScope(() => {})
      return () => setScopeInfo(`setup cleanup ran, state=${scope?.state}`)
    })
    scope.run(() => {
      log.push(`inside run: activeScope.current = ${String(!!activeScope.current)}`)
      addToScope(() => setCleanups(n => n + 1))
      addBuilderToScope({ then: (resolve: (animation?: unknown) => void) => { resolve(undefined) } })
      const scoped = createScopedAnimate({ scope: { current: scopedBox, animations: [] } as never })
      scoped(scopedBox, { x: [0, 80] }, { duration: 0.6 })
    })
    log.push(`outside run: activeScope.current = ${String(!!activeScope.current)}`)
    setScopeLog(log.join(' | '))
    setScopeInfo(`state=${scope.state}`)
  }

  return (
    <>
      <h4>JSAnimation / animateValue</h4>
      <Controls>
        <Button onClick={() => startJs(false)}>new JSAnimation</Button>
        <Button onClick={() => startJs(true)}>animateValue</Button>
        <Button onClick={() => { js?.pause(); describeJs() }}>pause</Button>
        <Button onClick={() => { js?.play(); describeJs() }}>play</Button>
        <Button onClick={() => { if (js) js.time = 1; describeJs() }}>seek 1s</Button>
        <Button onClick={() => { if (js) js.speed = 2; describeJs() }}>speed 2</Button>
        <Button onClick={() => { js?.complete(); describeJs() }}>complete</Button>
        <Button onClick={() => { js?.cancel(); describeJs() }}>cancel</Button>
      </Controls>
      <Readout label="value" value={jsValue().toFixed(1)} />
      <Readout label="info" value={jsInfo()} />

      <h4>GroupAnimation / GroupAnimationWithThen</h4>
      <Controls>
        <Button onClick={() => startGroup(false)}>GroupAnimation</Button>
        <Button onClick={() => startGroup(true)}>GroupAnimationWithThen</Button>
        <Button onClick={() => { group?.pause(); setGroupInfo(`paused at time=${group?.time.toFixed(2)}`) }}>pause</Button>
        <Button onClick={() => { group?.play(); setGroupInfo('playing') }}>play</Button>
        <Button onClick={() => { group?.complete(); setGroupInfo('completed') }}>complete</Button>
        <Button onClick={() => { group?.cancel(); setGroupInfo('cancelled') }}>cancel</Button>
      </Controls>
      <Readout label="a / b" value={`${groupA().toFixed(0)} / ${groupB().toFixed(0)}`} />
      <Readout label="group" value={groupInfo()} />

      <h4>animateSingleValue / delay</h4>
      <Controls>
        <Button onClick={() => animateSingleValue(single, single.get() === 100 ? 0 : 100, { duration: 0.8 })}>animateSingleValue</Button>
        <Button
          onClick={() => {
            cancelDelay?.()
            setDelayed('waiting 0.8s')
            cancelDelay = delay(() => setDelayed('fired'), 0.8)
          }}
        >
          delay 0.8s
        </Button>
        <Button onClick={() => { cancelDelay?.(); setDelayed('cancelled') }}>cancel delay</Button>
      </Controls>
      <Readout label="single value" value={singleNow().toFixed(1)} />
      <Readout label="delay(callback, seconds)" value={delayed()} />

      <h4>Native animations</h4>
      <Controls>
        <Button onClick={startMini}>animateMini</Button>
        <Button onClick={startWaapi}>startWaapiAnimation</Button>
        <Button onClick={startArc}>animate with arc() path</Button>
      </Controls>
      <Stage height="110px">
        <div ref={box} data-testid="native-box" class="box" style={{ width: '40px', height: '40px' }} />
      </Stage>
      <Readout label="native" value={nativeInfo()} />

      <h4>MotionValue helpers</h4>
      <Controls>
        <Button onClick={() => jump(0)}>source = 0</Button>
        <Button onClick={() => jump(100)}>source = 100</Button>
        <Button
          onClick={() => {
            const controls = animateMotionValue('x', animated, animated.get() === 100 ? 0 : 100, { duration: 0.5 })(() => {})
            setAnimMv(`controls.duration=${controls?.duration}, instanceof AsyncMotionValueAnimation=${controls instanceof AsyncMotionValueAnimation}`)
          }}
        >
          animateMotionValue
        </Button>
      </Controls>
      <Readout label="source (motionValue)" value={sourceNow().toFixed(1)} />
      <Readout label="springValue(source)" value={sprNow().toFixed(1)} />
      <Readout label="followValue(source)" value={folNow().toFixed(1)} />
      <Readout label="attachSpring(MotionValue, source)" value={attachedSpringNow().toFixed(1)} />
      <Readout label="attachFollow(motionValue, source)" value={attachedFollowNow().toFixed(1)} />
      <Readout label="transformValue(source * 2)" value={doubledNow().toFixed(1)} />
      <Readout label="mapValue(source, [0,100], ['0%','100%'])" value={mappedNow()} />
      <Readout label="resolveMotionValue(source)" value={String(resolveMotionValue(sourceNow() >= 0 ? source : 0))} />
      <Readout label="animateMotionValue" value={`${animatedNow().toFixed(1)} (${animMv()})`} />

      <h4>scopeMotion</h4>
      <Controls>
        <Button onClick={startScope}>scopeMotion + run</Button>
        <Button onClick={() => { scope?.stop(); setScopeInfo(`state=${scope?.state}`) }}>stop</Button>
        <Button onClick={() => { scope?.cancel(); setScopeInfo(`state=${scope?.state}`) }}>cancel</Button>
      </Controls>
      <Stage height="50px">
        <div ref={scopedBox} class="box" style={{ width: '30px', height: '30px' }} />
      </Stage>
      <Readout label="scope" value={scopeInfo()} />
      <Readout label="cleanups run via addToScope" value={cleanups()} />
      <Readout label="activeScope" value={scopeLog()} />
    </>
  )
}
