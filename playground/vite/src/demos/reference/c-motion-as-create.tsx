import type { JSX } from '@solidjs/web'
import { createSignal, For, onSettled } from 'solid-js'
import { isMotionComponent, isValidMotionProp, Motion, motion, unwrapMotionComponent } from 'motion-solid'
import { Button, Controls, Readout, Stage } from '../../ui'

export const meta = {
  id: 'c-motion-as-create',
  title: 'Motion as / motion.create',
  group: 'reference',
  description: '<Motion as="section">, <Motion as={Component}>, motion.create(tag) and motion.create(Component) with and without forwardMotionProps, plus the isMotionComponent / unwrapMotionComponent / isValidMotionProp helpers.',
  covers: ['Motion', 'motion', 'isMotionComponent', 'unwrapMotionComponent', 'isValidMotionProp'],
} as const

/** A plain component: it must spread props (including `ref`) onto its root for motion to reach the DOM. */
function Card(props: { label?: string, animate?: unknown, children?: JSX.Element, ref?: any, style?: any }) {
  return (
    <article {...props} class="box" style={{ width: '150px', height: '70px', padding: '6px', color: '#fff', 'font-size': '12px', ...props.style }}>
      {props.label}
      <div>animate prop seen: {props.animate === undefined ? 'no' : 'yes'}</div>
    </article>
  )
}

const MotionCard = motion.create(Card)
const MotionCardForwarded = motion.create(Card, { forwardMotionProps: true })
const MotionLink = motion.create('a')
const ids = ['as-tag', 'as-comp', 'create-comp', 'create-fwd', 'create-tag']

export default function Demo() {
  const [on, setOn] = createSignal(false)
  const [lines, setLines] = createSignal<string[]>([])
  const target = () => ({ x: on() ? 40 : 0, opacity: on() ? 1 : 0.4 })
  const tr = { type: 'spring', stiffness: 150, damping: 18 } as const
  const refresh = () => setLines(ids.map((id) => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
    return `${id}: <${el?.tagName.toLowerCase() ?? '?'}> transform ${el?.style.transform || 'none'} opacity ${el?.style.opacity || '-'}`
  }))
  onSettled(() => { setTimeout(refresh, 100) })

  return (
    <>
      <Controls>
        <Button pressed={on()} onClick={() => { setOn(v => !v); setTimeout(refresh, 1200) }}>Toggle</Button>
        <Readout label="isMotionComponent(motion.div)" value={String(isMotionComponent(motion.div))} ok={isMotionComponent(motion.div)} />
        <Readout label="isMotionComponent(Card)" value={String(isMotionComponent(Card as any))} ok={!isMotionComponent(Card as any)} />
        <Readout label="isMotionComponent(MotionCard)" value={String(isMotionComponent(MotionCard as any))} ok={isMotionComponent(MotionCard as any)} />
        <Readout label="unwrap(MotionCard) === Card" value={String(unwrapMotionComponent(MotionCard as any) === (Card as any))} ok={unwrapMotionComponent(MotionCard as any) === (Card as any)} />
        <Readout label="isValidMotionProp(animate / href)" value={`${isValidMotionProp('animate')} / ${isValidMotionProp('href')}`} ok={isValidMotionProp('animate') && !isValidMotionProp('href')} />
      </Controls>
      <Stage height="420px">
        <div style={{ display: 'grid', gap: '10px' }}>
          <Motion as="section" data-testid="as-tag" class="box" style={{ width: '150px', height: '40px', color: '#fff' }} animate={target()} transition={tr}>as="section"</Motion>
          <Motion as={Card} data-testid="as-comp" label="as={Card}" animate={target()} transition={tr} />
          <MotionCard data-testid="create-comp" label="create(Card)" animate={target()} transition={tr} />
          <MotionCardForwarded data-testid="create-fwd" label="create(Card, forward)" animate={target()} transition={tr} />
          <MotionLink data-testid="create-tag" href="#/reference/c-motion-as-create" animate={target()} transition={tr}>motion.create('a')</MotionLink>
        </div>
        <div style={{ 'font-size': '12px', 'font-family': 'ui-monospace, monospace' }}>
          <For each={lines()}>{line => <div>{line}</div>}</For>
          <div>(readout refreshes after each toggle settles)</div>
        </div>
      </Stage>
    </>
  )
}
