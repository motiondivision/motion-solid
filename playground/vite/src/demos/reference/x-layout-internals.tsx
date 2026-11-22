import { createSignal, onSettled } from 'solid-js'
import {
  LayoutAnimationBuilder,
  LayoutGroup,
  acquireProjectionNode,
  animateLayout,
  cleanDirtyNodes,
  createLayoutGroup,
  flushLayoutSnapshots,
  globalProjectionState,
  layoutRefresh,
  motion,
  nodeGroup,
  parseAnimateLayoutArgs,
  propagateDirtyNodes,
  recordStats,
  releaseElement,
  statsBuffer,
} from 'motion-solid'
import { Button, Controls, Readout } from '../../ui'

export const meta = {
  id: 'x-layout-internals',
  title: 'Layout internals: animateLayout, projection nodes, refresh, stats',
  group: 'reference',
  description:
    'A layout box resized three ways: createLayoutGroup().forceRender(), layoutRefresh.run(group) and flushLayoutSnapshots(). animateLayout() animates imperative DOM edits on data-layout elements. acquireProjectionNode / propagateDirtyNodes / cleanDirtyNodes / releaseElement drive a node by hand, nodeGroup() makes a group and recordStats() counts projection work.',
  covers: [
    'LayoutAnimationBuilder',
    'LayoutGroup',
    'acquireProjectionNode',
    'animateLayout',
    'cleanDirtyNodes',
    'createLayoutGroup',
    'flushLayoutSnapshots',
    'globalProjectionState',
    'layoutRefresh',
    'nodeGroup',
    'parseAnimateLayoutArgs',
    'propagateDirtyNodes',
    'recordStats',
    'releaseElement',
    'statsBuffer',
  ],
} as const

export default function Demo() {
  const [big, setBig] = createSignal(false)
  const [tick, setTick] = createSignal(0)
  const refresh = () => setTick(n => n + 1)
  const [log, setLog] = createSignal('nothing yet')
  const [stats, setStats] = createSignal('not recording')
  const group = createLayoutGroup()
  const customGroup = nodeGroup()
  let imperative!: HTMLDivElement
  let held!: HTMLDivElement
  let heldRelease: VoidFunction | undefined

  onSettled(() => () => {
    heldRelease?.()
    statsBuffer.value = null
  })

  const toggleBy = (how: 'group' | 'refresh' | 'flush') => {
    setBig(v => !v)
    // Let Solid commit the new size to the DOM before asking for a re-measure.
    queueMicrotask(() => {
      if (how === 'group') group.forceRender()
      else if (how === 'refresh') layoutRefresh.run(customGroup)
      else flushLayoutSnapshots()
      refresh()
      setLog(`${how}: globalProjectionState = ${JSON.stringify(globalProjectionState)}`)
    })
  }

  const runAnimateLayout = () => {
    const builder = animateLayout(imperative, () => {
      imperative.style.width = imperative.style.width === '200px' ? '80px' : '200px'
    }, { duration: 0.5 })
    setLog(`animateLayout returned LayoutAnimationBuilder: ${builder instanceof LayoutAnimationBuilder}`)
    builder.then(() => setLog(l => l + ' (animation resolved)'))
  }

  const holdNode = () => {
    heldRelease?.()
    const [node, release] = acquireProjectionNode(held)
    heldRelease = release
    setLog(`acquireProjectionNode: node id=${(node as unknown as { id: number }).id}, isProjectionDirty=${String((node as unknown as { isProjectionDirty?: boolean }).isProjectionDirty)}`)
  }
  const dirty = () => {
    const [node, release] = acquireProjectionNode(held)
    propagateDirtyNodes(node)
    const afterPropagate = (node as unknown as { isProjectionDirty?: boolean }).isProjectionDirty
    cleanDirtyNodes(node)
    setLog(`propagateDirtyNodes -> isProjectionDirty=${String(afterPropagate)}, cleanDirtyNodes -> ${String((node as unknown as { isProjectionDirty?: boolean }).isProjectionDirty)}`)
    release()
  }
  const releaseHeld = () => {
    const removed = releaseElement(held)
    heldRelease = undefined
    setLog(`releaseElement returned ${removed === undefined ? 'undefined (no component-owned values)' : `a map of ${removed.size} values`}`)
  }

  const startStats = () => {
    try {
      recordStats()
      setStats('recording: toggle the layout box, then read')
    } catch (error) {
      statsBuffer.value = null
      setStats(`reset (${(error as Error).message}); press again`)
    }
  }
  const readStats = () => {
    const value = statsBuffer.value?.layoutProjection
    const sum = (list: number[]) => list.reduce((a, b) => a + b, 0)
    setStats(value ? `frames=${value.nodes.length} nodes=${sum(value.nodes)} targetDeltas=${sum(value.calculatedTargetDeltas)} projections=${sum(value.calculatedProjections)}` : 'not recording')
  }

  return (
    <>
      <Controls>
        <Button onClick={() => toggleBy('group')}>resize + createLayoutGroup().forceRender()</Button>
        <Button onClick={() => toggleBy('refresh')}>resize + layoutRefresh.run(nodeGroup())</Button>
        <Button onClick={() => toggleBy('flush')}>resize + flushLayoutSnapshots()</Button>
      </Controls>
      <LayoutGroup id="internals">
        <motion.div layout data-testid="layout-box" class="box" style={{ width: big() ? '220px' : '90px', height: '50px' }} />
      </LayoutGroup>
      <Readout label="log" value={log()} />
      <Readout label="globalProjectionState" value={(tick(), JSON.stringify(globalProjectionState))} />
      <Readout label="nodeGroup() keys" value={Object.keys(customGroup).join(', ')} />

      <h4>animateLayout (imperative, data-layout)</h4>
      <Controls>
        <Button onClick={runAnimateLayout}>animateLayout width toggle</Button>
        <Button onClick={() => setLog(`parseAnimateLayoutArgs: ${Object.keys(parseAnimateLayoutArgs(imperative, () => {}, { duration: 1 })).join(',')}`)}>parseAnimateLayoutArgs</Button>
      </Controls>
      <div ref={imperative} data-layout data-testid="imperative-box" class="box" style={{ width: '80px', height: '40px' }} />

      <h4>Projection nodes by hand</h4>
      <Controls>
        <Button onClick={holdNode}>acquireProjectionNode</Button>
        <Button onClick={dirty}>propagateDirtyNodes + cleanDirtyNodes</Button>
        <Button onClick={releaseHeld}>releaseElement</Button>
      </Controls>
      <div ref={held} data-testid="held-box" class="box" style={{ width: '60px', height: '30px' }} />

      <h4>Stats</h4>
      <Controls>
        <Button onClick={startStats}>recordStats()</Button>
        <Button onClick={readStats}>read statsBuffer.value</Button>
        <Button onClick={() => { statsBuffer.value = null; setStats('cleared') }}>clear</Button>
      </Controls>
      <Readout label="stats" value={stats()} />
    </>
  )
}
