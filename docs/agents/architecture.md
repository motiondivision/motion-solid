# Architecture

Deep-dive reference for `motion-solid` internals, for contributors. Read the section matching the subsystem you are touching. Paths are under `packages/motion/src`. This describes the code as implemented; the rules it follows are in [porting-contract.md](porting-contract.md).

## Motion components (`components/motion/`)

1. `motion` (`motion/index.ts`) is `createMotionComponentWithFeatures(domMax)`: a Proxy so `motion.div`, `motion.svg`, `motion.create(Component, options)` all work. `m` (`motion/m.ts`) is the same with no bundle, for use under `LazyMotion`. `Motion` is `motion.create('div')`.
2. `createMotionComponent` (`motion/utils.tsx`) builds the Solid component. Components for plain tags are cached, separately for bundle and bundle-less use. It resolves the tag from `props.as ?? component`, calls `createMotionState`, renders through `dynamic(tag)` from `@solidjs/web`, and provides the state with `<MotionContext value={state}>`. The element's own attributes are `omit(props, ...motionPropKeys, 'children', 'ref')`, merged with the attributes motion computes. Void tags (`img`, `input`, ...) get no children. `forwardMotionProps` passes motion props through to a wrapped component. There is no `asChild`.
3. `createMotionState` (`motion/use-motion-state.ts`) owns one `MotionState`:
   - the state is created in the first run of an eager options memo (`resolveMotionProps` merges layout group, presence and `MotionConfig` into the props), with the parent state from `MotionContext`, so children can read it from context while rendering;
   - `onSettled` mounts it with the real element. Solid settles parents before children, so a parent mounts its not-yet-mounted children (depth first) before itself (`pendingChildMounts`), keeping variant children registered when the parent animation starts;
   - a split `createRenderEffect` (deferred) calls `updateOptions` + `beforeUpdate`; a deferred `createEffect` calls `update`;
   - `onCleanup` runs `beforeUnmount`, then `unmount` only if the element is detached. If it is still connected, an AnimatePresence exit holds it and unmounts the state when done.
4. Style ownership: an `attrs` memo computes `style` (user style plus motion's latest values) and SVG attributes once, and again only when the user's props change. Motion writes the DOM from its frame loop afterwards, so Solid must never re-set animated properties from a signal. Style keys are converted to dash-case because Solid writes object styles with `setProperty`.
5. `props.ts` lists every prop motion consumes (`motionPropKeys`) and the defaults (`motionPropDefaults`); React names (`whileTap`, `onTap`, `viewport`) are accepted and mapped by `resolveMotionProps`. The `ref` prop (a function or an array of them) is forwarded by the component (`ref={[motion.ref, ...asArray(props.ref)]}` in `utils.tsx`). `Reorder.Group` and `Reorder.Item` flatten the array and use `mergeRefs` inside a memo, handed to `Motion` as a lazy `ref` prop, because reading `props.ref` in the component body emits `STRICT_READ_UNTRACKED` when the props are a merge (a spread).

## Visual element state (`state/`)

`MotionState` (`state/motion-state.ts`) is copied from motion-vue and is framework-free: it creates the HTML/SVG visual element (`create-visual-element.ts`), tracks the parent and children (for lifecycle ordering and variant propagation), manages the active animation types (initial, animate, whileHover, exit, ...) and exposes `mount`, `unmount`, `beforeUnmount`, `updateOptions`, `beforeUpdate`, `update`, `setBundle`. `mountedStates` is a `WeakMap<Element, MotionState>`. `style.ts` builds the inline style / SVG attributes; `utils.ts` resolves initial values.

## Features (`features/`)

Modular, loaded through each state's bundle. `domAnimation` (`dom-animation.ts`) and `domMax` (`dom-max.ts`) are `{ renderer, features }`. Each feature extends `Feature` with lifecycle hooks (`beforeMount`, `mount`, `update`, `unmount`). Verbatim from motion-vue apart from Solid-specific edits:

- `animation/`: variant based animation, `calc-child-stagger.ts`.
- `gestures/`: `hover`, `press`, `focus`, `in-view`, `pan` (`PanSession`), `drag` (`VisualElementDragControls`, `DragControls`, constraints). They attach their own listeners at mount and own cleanup. `createDragControls` is the only Solid-named piece of the drag folder.
- `layout/`: `LayoutFeature` and the projection node setup (FLIP).
- `exit/`: `ExitFeature`, the only holder of the exit-in-flight flag (`MotionState.isExiting`).

## Contexts (`components/context.ts` and siblings)

Plain Solid 2 contexts, created through `utils/createContext.ts` (a thin wrapper that gives a named error when no provider and no fallback). Provided with `<Ctx value={v}>`. Context values that change over time are accessors.

| Context | Consumer | Notes |
|---------|----------|-------|
| `MotionContext` | `useMotionContext()` | parent `MotionState` or `null` |
| `LayoutGroupContext` | `useLayoutGroupContext()` | `key` is an accessor bumped by `forceRender` |
| `MotionConfigContext` | `useMotionConfig()` | returns an `Accessor<MotionConfigState>` |
| `AnimatePresenceContext` | `useAnimatePresenceContext(null?)` | `initial` / `custom` getters, registry callbacks |
| `LazyMotionContext` | `useLazyMotionContext()` | `features` accessor, `strict` |
| `ReorderContext` | `useReorderContext()` | group registration for items |

## AnimatePresence (`components/animate-presence/`)

Built on `@solid-primitives/transition-group` and adapted to wait for motion `exit` animations.

- `AnimatePresence.tsx` provides the presence context (`createPresenceContainer`), resolves children with `children()`, and renders either:
  - `ListPresence` (`sync`, `popLayout`): `createListTransition` with `exitMethod: 'keep-index'` over entries keyed by DOM node. A node that returns during its exit gets a fresh entry so the transition list never reports a second removal for one object;
  - `WaitPresence` (`wait`): rendered inside a `Loading` boundary. The displayed node is an async memo that stays pending while the leaving child's exit runs, so Solid keeps the old node on screen and holds everything the entering subtree schedules (effects, `onSettled`, `createInView`, `whileInView`, ref-driven mount) until the new node is attached. The entering child's component body still runs as soon as its source changes (Solid cannot defer a `<Show>` branch's body); only what it schedules is held. Consequence: signals that cause the swap are held for the exit duration, so an outside binding of the same signal shows the old value until the exit finishes. Only the first element child is considered; several children log React's dev warning.
  Both branches call the exit session when a removal starts and `flush()` when it finishes so the exit session sees the element leave the DOM. On the server (`ServerBranch`) children render once inside the presence context with no transition layer, allocating the same hydration-id-bearing primitives in the same order as the client.
- `exit-session.ts` (`createExitSession`) is the bookkeeping: registries of motion states and presence handlers found by containment inside the leaving element, one live session per exiting element (a duplicate leave joins it), fan-in to `onExitComplete`, and `popLayout` pinning through an injected style element (`nonce` comes from `MotionConfig`).
- `use-presence.ts` exposes `createPresence` (hold the removal until `safeToRemove` or an `onExit` promise), `createIsPresent` (read only) and `createPresenceData`. `use-presence-container.ts` wires the context getters (`initial` only applies to the first render).
- `as` renders a wrapper element via `dynamic`; without it children render directly.
- **Deferred work after a removal pass.** Presence, unmount and layout code that must run after the current flush (finishing an empty exit session, releasing a handler after cleanup, `disposeAfterExits`, `unmountIfDetached`, the layout coordinator's seed and refresh) goes through `afterFlush` (`utils/after-flush.ts`): `runWithOwner(null, () => onFlush(fn))`. `onFlush` warns `ON_FLUSH_IN_OWNED_SCOPE` when called under an owner, and these sites run from `onCleanup` and component bodies, so the registration is owner-less; the callback's own guards (`session.active`, `isConnected`, `isMounted`) decide whether the work still applies. Not `onSettled`: owner-bound, it fails the mixed-batch and propagate presence tests. `projection.ts` (`onExitComplete`) keeps `queueMicrotask` because it defers out of Motion's own microtask batcher; jsdom does not reproduce that reentrancy, so it needs a browser test before it changes.

## Reorder (`components/reorder/`)

`Reorder.Group` / `Reorder.Item` (`Group.tsx`, `Item.tsx`) wrap `Motion`. The group tracks item layouts, detects the axis when `axis` is not set (`utils.ts`, `checkReorder`), emits `onReorder(newOrder, moved)`, and supports keyboard reordering (Space grabs, arrows move, Escape cancels). Pointer listeners use `@solid-primitives/event-listener`. `auto-scroll.ts` scrolls the nearest scroll parent while dragging. Items accept `children` as a function of `{ isDragging }`.

## Layout (`features/layout/`, `components/LayoutGroup.tsx`)

`LayoutGroup` provides `LayoutGroupContext` through `createLayoutGroupProvider` (id/group inheritance, `forceRender`, `key`). `layoutId` is namespaced by the group id in `resolveMotionProps`; a new component with a `layoutId` that already has a lead skips its `initial` animation.

**Layout changes caused elsewhere (`coordinator.ts`).** React re-renders every layout component under a re-rendering parent, so each snapshots before the commit. Solid re-renders nothing: `<For>` moves DOM nodes, `<Show>` inserts or removes one, a signal grows an accordion. Solid 2.0.3 has no supported pre-flush seam (`onFlush` runs after the flush, `setWriteHook` is an internal single-slot hook), so the coordinator keeps the projection tree's last measured layout (`node.layout`) as the "before" box and detects the change afterwards, before paint:

- A node registers in `LayoutFeature.mount` when it has `layout` or `layoutId` and unregisters in `unmount`. Nothing is observed while none is registered.
- One `MutationObserver` (child lists; `class`, `style`, `hidden`, `open`, `width`, `height` attributes) and one `ResizeObserver` (the nodes and their parents: container resize, grid reflow, text changes). Motion's own style writes (transform, opacity, ...) on motion elements are ignored, so a running animation never triggers an update and nothing runs per frame.
- On a change, every eligible node (present, not a non-lead `layoutId` member, no `layoutDependency`) gets `willUpdate()`, then its snapshot is replaced by the cached layout (a node still animating uses its projection target, so a reshuffle in flight continues from where the element is), and the root's `didUpdate()` measures the new layout and animates the difference. Zero deltas animate nothing. Nodes already snapshotted by their own update path keep that (accurate, pre-DOM) snapshot.
- When a layout node updates or unmounts through its own path (`LayoutFeature.getSnapshot`), it also snapshots the other layout nodes right away, while the DOM is still old.
- `createLayoutGroup().forceRender` (and the group's key bump) calls `refreshLayout(group)`: re-run layout for the group (every layout node outside a group) after a change the observers cannot see, e.g. a class set from a stylesheet on an attribute not in the filter. The default context `forceRender` is `refreshLayout()` instead of a no-op. A key bump alone never snapshots (`use-motion-state.ts` skips `beforeUpdate` when only the key changed), because the snapshot could be taken after the DOM changed.
- `layoutRefresh` in `components/context.ts` is the late-bound hook to `refreshLayout`, so bundles without `layout` do not include `features/layout/`.

`layoutDependency`, unmount-time snapshots and AnimatePresence `popLayout` keep working through the own-update path; `layoutScroll`/`layoutRoot` are handled by the projection's own scroll bookkeeping during `willUpdate`.

**`isStatic`.** `MotionConfig isStatic` (React semantics): `MotionState` creates no visual element and no features, so nothing animates and no gesture, layout or exit runs. The element renders the `initial` values (the `animate` values when `initial` is `false`) from the options, recomputed when props change, and style MotionValues are rendered by value and re-rendered when they change (`use-motion-state.ts`).

## Values and animation (`value/`, `animation/`, `utils/`)

- `createMotionValue` is motion-dom's `motionValue`. `createTransform`, `createSpring`/`createFollowValue`, `createVelocity`, `createMotionTemplate`, `createTime`, `createMotionValueEvent`, `createComputedMotionValue` and `createCombineMotionValues` return MotionValues and take accessors for reactive inputs.
- `createScroll` returns the six scroll MotionValues. `options`, `container` and `target` are accessors; elements are resolved after mount, and the acceleration config (ScrollTimeline/ViewTimeline) is set by a render effect so it is in place before dependent values read it. Delegates to `scroll` from `framer-motion/dom`; nothing is tracked on the server.
- `createAnimate` returns `[scope, animate]`: `scope` is a Solid `ref` callback that also carries `current` / `animations`; animations stop on owner disposal and honour `MotionConfig`. `createAnimationControls` mounts its controls in `onSettled`. `createReducedMotion` uses `@solid-primitives/media`; `createPageInView` is local (`@solid-primitives/page-utilities` creates its signal only on the client, which shifts hydration ids).
- `createInView` accepts the same element inputs (element accessor or `{ current }`) and resolves them again after mount, so `() => el` works. It wraps motion's `inView` (not `@solid-primitives/intersection-observer`) because it shares `amount` / `margin` / `root` semantics with the component. `createDomRef` is the `[element, ref]` pair for primitives that need an element accessor.
- `createAnimationFrame` uses motion's `frame.update`, not `@solid-primitives/raf`, so it runs in the same loop step as value animations.

## Ref factories and `makeMotion` (`directive/`)

Solid 2 has no `use:` directives, so motion-vue's `v-motion` becomes `attachMotion(options)`, a factory called in an owner that returns a `ref` callback. Two phases: the factory builds the options memo and update effects and registers cleanup; the returned callback only records the element; `onSettled` creates and mounts the `MotionState` and applies initial styles. `createAttachMotion(bundle?, defaults?)` and `createPresetMotion(preset, bundle?)` build variants. No parent-variant propagation (no parent state), no SSR (`getMotionSSRStyle` returns the initial style instead).

`makeMotion(element, options, bundle?)` is the imperative counterpart, following the `make*` convention of Solid Primitives (`makeEventListener`): it needs no reactive primitives (options are a plain object), so it works wherever creating primitives is forbidden. It builds and mounts the `MotionState` synchronously, registers `remove` with `tryOnCleanup` (so it is disposed with the owner it was called in) and returns `remove`. Unlike the ref factory's cleanup, `remove` always unmounts: the element is not owned by a disposing component, so nothing else would. It reads the layout group, presence and `MotionConfig` contexts only when called inside an owner. Solid 2 forbids registering cleanup inside `onSettled` and an effect's apply callback, so call it from a component body or an event handler.

## Other components

- `LazyMotion` provides the bundle (object: synchronous; promise or loader function: when it resolves, through a boxed effect compute so Solid does not await it). `m` components read it and call `state.setBundle`. `strict` throws if a full `motion` component renders below it.
- `MotionConfig` merges parent config and provides an accessor.
- `AnimateView` / `startTransition` implement the View Transitions API wrapper (`animate-view/`), resolving elements with `@solid-primitives/refs` and detecting DOM updates inside the layer elements with `@solid-primitives/mutation-observer`.
- `RowValue` renders a MotionValue as a text node updated in place.

## Build

`packages/motion/vite.config.ts`: `@solidjs/vite-plugin`, `vite-plugin-dts` (types to `dist/es`), ES output only, `preserveModules`, `@/` alias to `src`. Dependencies, peers, `solid-js*`, `@solidjs/*` and `framer-motion/dom` are external. The root `exports` map points at `dist/es/index.mjs`, so the playground needs a build first. A `prebuild` step copies the root `README.md`, `NOTICE` and `LICENSE` into `packages/motion` so they ship in the package (`files`), and `prepack` builds.

## Testing

Vitest with jsdom and `@solidjs/testing-library`, tests co-located in `__tests__/`. Solid 2 batches writes to a microtask: call `flush()` from `solid-js` after signal writes before asserting. jsdom has no layout or IntersectionObserver; tests that need an `offsetParent` or an observer stub them (see `animate-presence.test.tsx`). `src/__tests__/tree-shaking.test.ts` bundles `m` + `LazyMotion` + `domAnimation` with vite and asserts no drag, layout, reorder or `domMax` module contributes bytes (a `domMax` bundle is the control). `playground/vite` is typechecked and built by `pnpm --filter @motion-solid/playground-vite build`.
