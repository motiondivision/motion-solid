import { createSignal, onSettled } from 'solid-js'
import {
  DOMKeyframesResolver,
  DocumentProjectionNode,
  FlatTree,
  HTMLProjectionNode,
  KeyframeResolver,
  NativeAnimationExtended,
  NativeAnimationWrapper,
  NodeStack,
  SubscriptionManager,
  createProjectionNode,
  flushKeyframeResolvers,
  rootProjectionNode,
} from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-engine-classes',
  title: 'Engine classes: SubscriptionManager, FlatTree, NodeStack, projection nodes, resolvers, native wrappers',
  group: 'reference',
  description:
    'Instantiate the engine building blocks by hand and see them work: a SubscriptionManager with listeners, a depth-sorted FlatTree, a NodeStack promoting and relegating stub nodes, projection node classes from createProjectionNode, keyframe resolvers (KeyframeResolver, DOMKeyframesResolver, flushKeyframeResolvers) and WAAPI animations wrapped by NativeAnimationWrapper / NativeAnimationExtended.',
  covers: [
    'DOMKeyframesResolver',
    'DocumentProjectionNode',
    'FlatTree',
    'HTMLProjectionNode',
    'KeyframeResolver',
    'NativeAnimationExtended',
    'NativeAnimationWrapper',
    'NodeStack',
    'SubscriptionManager',
    'createProjectionNode',
    'flushKeyframeResolvers',
    'rootProjectionNode',
  ],
} as const

export default function Demo() {
  let target!: HTMLDivElement
  let wrapped!: HTMLDivElement
  let extended!: HTMLDivElement
  const [subs, setSubs] = createSignal('no listeners yet')
  const [tree, setTree] = createSignal('empty')
  const [stack, setStack] = createSignal('empty')
  const [nodes, setNodes] = createSignal('')
  const [resolved, setResolved] = createSignal('not resolved')
  const [native, setNative] = createSignal('idle')
  const [attached, setAttached] = createSignal(false)
  onSettled(() => { setAttached(true) })

  // --- SubscriptionManager
  const manager = new SubscriptionManager<(value: number) => void>()
  const unsubscribers: VoidFunction[] = []
  const received: string[] = []
  const addListener = () => {
    const id = unsubscribers.length + 1
    unsubscribers.push(manager.add(value => received.push(`#${id}:${value}`)))
    setSubs(`${manager.getSize()} listeners`)
  }
  const notify = () => {
    received.length = 0
    manager.notify(Math.round(Math.random() * 100))
    setSubs(`${manager.getSize()} listeners, received ${received.join(' ') || 'nothing'}`)
  }
  const dropListener = () => {
    unsubscribers.pop()?.()
    setSubs(`${manager.getSize()} listeners`)
  }
  const clearListeners = () => {
    manager.clear()
    unsubscribers.length = 0
    setSubs('cleared: 0 listeners')
  }

  // --- FlatTree
  const flat = new FlatTree()
  const items = [{ id: 'deep', depth: 3 }, { id: 'root', depth: 0 }, { id: 'mid', depth: 1 }]
  const buildTree = () => {
    items.forEach(item => flat.add(item))
    const order: string[] = []
    flat.forEach(item => order.push((item as unknown as { id: string }).id))
    flat.remove(items[1])
    const after: string[] = []
    flat.forEach(item => after.push((item as unknown as { id: string }).id))
    setTree(`added deep/root/mid, forEach visits by depth: ${order.join(' > ')}; after removing root: ${after.join(' > ')}`)
    items.forEach(item => flat.remove(item))
  }

  // --- NodeStack with stub nodes
  const makeStub = (name: string) => ({
    name,
    isPresent: true,
    instance: document.body,
    options: {},
    root: undefined,
    snapshot: undefined,
    scheduleRender: () => {},
    show: () => {},
    hide: () => {},
    updateSnapshot: () => {},
    unmount: () => {},
  })
  const runStack = () => {
    const nodeStack = new NodeStack()
    const a = makeStub('a')
    const b = makeStub('b')
    nodeStack.add(a as never)
    nodeStack.add(b as never)
    nodeStack.promote(a as never)
    const first = (nodeStack.lead as unknown as { name: string }).name
    nodeStack.promote(b as never)
    const second = (nodeStack.lead as unknown as { name: string }).name
    const relegated = nodeStack.relegate(b as never)
    const third = (nodeStack.lead as unknown as { name: string }).name
    nodeStack.remove(a as never)
    setStack(`members=${nodeStack.members.length + 1} -> lead after promote(a)=${first}, promote(b)=${second}, relegate(b)=${relegated} -> lead=${third}; after remove(a) members=${nodeStack.members.length}`)
  }

  // --- projection node classes
  const buildNodes = () => {
    const Custom = createProjectionNode({
      attachResizeListener: () => () => {},
      measureScroll: () => ({ x: 0, y: 0 }),
      checkIsScrollRoot: () => false,
      resetTransform: () => {},
    } as never)
    const custom = new Custom({})
    const html = new HTMLProjectionNode({})
    const document_ = new DocumentProjectionNode()
    setNodes(
      `createProjectionNode -> class (id ${(custom as unknown as { id: number }).id}); HTMLProjectionNode id ${html.id}, depth ${html.depth}; DocumentProjectionNode id ${document_.id}; rootProjectionNode.current is ${rootProjectionNode.current ? 'set' : 'unset'}`,
    )
  }

  // --- resolvers
  const resolve = () => {
    const log: string[] = []
    const generic = new KeyframeResolver([0, 100], (keyframes: unknown[]) => log.push(`KeyframeResolver: ${JSON.stringify(keyframes)}`), 'x')
    generic.scheduleResolve()
    const dom = new DOMKeyframesResolver(
      ['0px', '100px'] as never,
      ((keyframes: unknown[]) => log.push(`DOMKeyframesResolver: ${JSON.stringify(keyframes)}`)) as never,
      'width',
      undefined,
      { current: target, readValue: () => '0px', measureViewportBox: () => undefined } as never,
    )
    dom.scheduleResolve()
    flushKeyframeResolvers()
    setResolved(log.join(' | ') || 'nothing resolved yet')
  }

  // --- native wrappers
  const runNative = () => {
    const wrapper = new NativeAnimationWrapper(wrapped.animate({ opacity: [1, 0.2, 1] }, { duration: 800, easing: 'ease-in-out' }))
    const extendedAnimation = new NativeAnimationExtended({
      element: extended,
      name: 'opacity',
      keyframes: [1, 0.2],
      duration: 600,
      ease: 'linear',
    } as never)
    setNative(`wrapper.duration=${wrapper.duration}s, extended.duration=${extendedAnimation.duration}s, extended time=${extendedAnimation.time.toFixed(2)}`)
    wrapper.then(() => setNative(text => text + ' (wrapper finished)'))
  }

  return (
    <>
      <h4>SubscriptionManager</h4>
      <Controls>
        <Button onClick={addListener}>add listener</Button>
        <Button onClick={notify}>notify</Button>
        <Button onClick={dropListener}>unsubscribe last</Button>
        <Button onClick={clearListeners}>clear</Button>
      </Controls>
      <Readout label="subscriptions" value={subs()} />
      <h4>FlatTree / NodeStack</h4>
      <Controls>
        <Button onClick={buildTree}>FlatTree add / forEach / remove</Button>
        <Button onClick={runStack}>NodeStack promote / relegate</Button>
      </Controls>
      <Readout label="FlatTree" value={tree()} />
      <Readout label="NodeStack" value={stack()} />
      <h4>Projection node classes</h4>
      <Controls>
        <Button onClick={buildNodes}>createProjectionNode + HTML + Document</Button>
      </Controls>
      <Readout label="nodes" value={nodes() || 'press the button'} />
      <h4>Keyframe resolvers</h4>
      <Controls>
        <Button onClick={resolve}>resolve + flushKeyframeResolvers</Button>
      </Controls>
      <div ref={target} style={{ width: '50px', height: '8px', background: '#cbd5e1' }} data-ready={attached() ? 'true' : 'false'} />
      <Readout label="resolved" value={resolved()} />
      <h4>Native animation wrappers</h4>
      <Controls>
        <Button onClick={runNative}>NativeAnimationWrapper + NativeAnimationExtended</Button>
      </Controls>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div ref={wrapped} data-testid="wrapped" class="box" style={{ width: '50px', height: '30px' }}>wrap</div>
        <div ref={extended} data-testid="extended" class="box" style={{ width: '50px', height: '30px' }}>ext</div>
      </div>
      <Readout label="native" value={native()} />
    </>
  )
}
