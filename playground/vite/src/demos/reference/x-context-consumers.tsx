import { createSignal, useContext } from 'solid-js'
import {
  AnimatePresence,
  AnimatePresenceContext,
  LayoutGroup,
  LayoutGroupContext,
  LazyMotion,
  LazyMotionContext,
  M,
  MotionConfig,
  MotionConfigContext,
  MotionContext,
  Reorder,
  ReorderContext,
  ReorderGroup,
  ReorderItem,
  domAnimation,
  motion,
  useAnimatePresenceContext,
  useLayoutGroupContext,
  useLazyMotionContext,
  useMotionConfig,
  useMotionContext,
  useReorderContext,
} from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-context-consumers',
  title: 'Context consumers and providers',
  group: 'reference',
  description:
    'Every context consumer (useMotionContext, useMotionConfig, useLayoutGroupContext, useAnimatePresenceContext, useLazyMotionContext, useReorderContext) rendered under its real provider and again under a hand-made provider (the raw *Context objects). Toggle the config and group id to watch the values change. Also uses M (the m alias) and ReorderGroup/ReorderItem directly.',
  expects: ['Reduced Motion enabled'],
  covers: [
    'AnimatePresence',
    'AnimatePresenceContext',
    'LayoutGroup',
    'LayoutGroupContext',
    'LazyMotion',
    'LazyMotionContext',
    'M',
    'MotionConfig',
    'MotionConfigContext',
    'MotionContext',
    'ReorderContext',
    'ReorderGroup',
    'ReorderItem',
    'useAnimatePresenceContext',
    'useLayoutGroupContext',
    'useLazyMotionContext',
    'useMotionConfig',
    'useMotionContext',
    'useReorderContext',
  ],
} as const

/** Reads every consumer; `id` prefixes the test ids so each zone can be asserted separately. */
function Consumers(props: { id: string }) {
  const motionState = useMotionContext()
  const config = useMotionConfig()
  const layout = useLayoutGroupContext()
  const presence = useAnimatePresenceContext(null)
  const lazy = useLazyMotionContext(null)
  const reorder = useReorderContext(null)
  const raw = useContext(MotionContext)
  return (
    <div class="readout" data-testid={props.id} style={{ 'flex-direction': 'column', 'align-items': 'flex-start', gap: '2px', 'font-size': '12px' }}>
      <span data-testid={`${props.id}-motion`}>useMotionContext: {motionState ? `state(${motionState.type})` : 'null'}; raw MotionContext same: {String(raw === motionState)}</span>
      <span data-testid={`${props.id}-config`}>
        useMotionConfig: reducedMotion={String(config().reducedMotion)} skipAnimations={String(config().skipAnimations)}
      </span>
      <span data-testid={`${props.id}-layout`}>useLayoutGroupContext: id={String(layout.id)} hasGroup={String(!!layout.group)}</span>
      <span data-testid={`${props.id}-presence`}>
        useAnimatePresenceContext(null): {presence ? `custom=${String(presence.custom)} registry=${String(!!presence.register)}` : 'null'}
      </span>
      <span data-testid={`${props.id}-lazy`}>
        useLazyMotionContext(null): {lazy ? `strict=${String(lazy.strict)} features=${Object.keys(lazy.features()).length}` : 'null'}
      </span>
      <span data-testid={`${props.id}-reorder`}>useReorderContext(null): {reorder ? `axis=${String(reorder.axis?.())}` : 'null'}</span>
    </div>
  )
}

export default function Demo() {
  const [reduced, setReduced] = createSignal<'user' | 'never' | 'always'>('never')
  const [groupId, setGroupId] = createSignal('alpha')
  const [custom, setCustom] = createSignal(1)
  const [order, setOrder] = createSignal(['a', 'b', 'c'])

  return (
    <>
      <Controls>
        <Button onClick={() => setReduced(v => (v === 'never' ? 'always' : v === 'always' ? 'user' : 'never'))}>reducedMotion: {reduced()}</Button>
        <Button onClick={() => setGroupId(v => (v === 'alpha' ? 'beta' : 'alpha'))}>group id: {groupId()}</Button>
        <Button onClick={() => setCustom(n => n + 1)}>presence custom: {custom()}</Button>
      </Controls>

      <h4>Outside every provider (defaults)</h4>
      <Consumers id="zone-none" />

      <h4>Real providers</h4>
      <MotionConfig reducedMotion={reduced()} skipAnimations={reduced() === 'always'}>
        <LayoutGroup id={groupId()}>
          <AnimatePresence custom={custom()}>
            <LazyMotion features={domAnimation} strict>
              <M class="box" style={{ width: 'auto', height: 'auto', padding: '8px' }} animate={{ opacity: 1 }}>
                <Consumers id="zone-real" />
              </M>
            </LazyMotion>
          </AnimatePresence>
        </LayoutGroup>
      </MotionConfig>

      <h4>Reorder: ReorderGroup / ReorderItem, consumer inside an item</h4>
      <ReorderGroup class="reorder" axis="y" values={order()} onReorder={setOrder}>
        <ReorderItem value="a">
          <Consumers id="zone-reorder" />
        </ReorderItem>
        <ReorderItem value="b">b</ReorderItem>
      </ReorderGroup>
      <Reorder.Group class="reorder" values={order()} onReorder={setOrder} style={{ display: 'none' }}>
        <Reorder.Item value="a">a</Reorder.Item>
      </Reorder.Group>

      <h4>Hand-made providers (raw Context objects)</h4>
      <MotionConfigContext value={() => ({ reducedMotion: 'always', skipAnimations: true })}>
        <LayoutGroupContext value={{ id: 'manual-group', key: () => 0 }}>
          <AnimatePresenceContext value={{ custom: 'manual', register: () => {} }}>
            <LazyMotionContext value={{ features: () => domAnimation, strict: true }}>
              <ReorderContext value={{ axis: () => 'x' }}>
                <motion.div class="box" style={{ width: 'auto', height: 'auto', padding: '8px' }}>
                  <Consumers id="zone-manual" />
                </motion.div>
              </ReorderContext>
            </LazyMotionContext>
          </AnimatePresenceContext>
        </LayoutGroupContext>
      </MotionConfigContext>

      <Readout label="expected" value="zone-real follows the buttons; zone-manual is fixed" />
    </>
  )
}
