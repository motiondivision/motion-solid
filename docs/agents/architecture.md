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
5. `props.ts` lists every prop motion consumes (`motionPropKeys`) and the defaults (`motionPropDefaults`); React names (`whileTap`, `onTap`, `viewport`) are accepted and mapped by `resolveMotionProps`. The `ref` prop (a function or an array of them) is forwarded by a small loop over `asArray(props.ref)` in `use-motion-state.ts`, because `mergeRefs` cannot take arrays; `Reorder.Group` and `Reorder.Item` flatten the array and then use `mergeRefs`.

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
  - `WaitPresence` (`wait`): `createSwitchTransition` in `out-in` mode for the first element child.
  Both call the exit session when a removal starts and `flush()` when it finishes so the exit session sees the element leave the DOM.
- `exit-session.ts` (`createExitSession`) is the bookkeeping: registries of motion states and presence handlers found by containment inside the leaving element, one live session per exiting element (a duplicate leave joins it), fan-in to `onExitComplete`, and `popLayout` pinning through an injected style element (`nonce` comes from `MotionConfig`).
- `use-presence.ts` exposes `createPresence` (hold the removal until `safeToRemove` or an `onExit` promise), `createIsPresent` (read only) and `createPresenceData`. `use-presence-container.ts` wires the context getters (`initial` only applies to the first render).
- `as` renders a wrapper element via `dynamic`; without it children render directly.

## Reorder (`components/reorder/`)

`Reorder.Group` / `Reorder.Item` (`Group.tsx`, `Item.tsx`) wrap `Motion`. The group tracks item layouts, detects the axis when `axis` is not set (`utils.ts`, `checkReorder`), emits `onReorder(newOrder, moved)`, and supports keyboard reordering (Space grabs, arrows move, Escape cancels). Pointer listeners use `@solid-primitives/event-listener`. `auto-scroll.ts` scrolls the nearest scroll parent while dragging. Items accept `children` as a function of `{ isDragging }`.

## Layout (`features/layout/`, `components/LayoutGroup.tsx`)

`LayoutGroup` provides `LayoutGroupContext` through `createLayoutGroupProvider` (id/group inheritance, `forceRender`, `key`). Motion components read `layoutGroup.key()` in their update effects so group changes re-snapshot and re-measure. `layoutId` is namespaced by the group id in `resolveMotionProps`; a new component with a `layoutId` that already has a lead skips its `initial` animation. `createLayoutGroupProvider` is the primitive behind `LayoutGroup`; `createLayoutGroup()` only reads the nearest group's `forceRender`.

## Values and animation (`value/`, `animation/`, `utils/`)

- `createMotionValue` is motion-dom's `motionValue`. `createTransform`, `createSpring`/`createFollowValue`, `createVelocity`, `createMotionTemplate`, `createTime`, `createMotionValueEvent`, `createComputedMotionValue` and `createCombineMotionValues` return MotionValues and take accessors for reactive inputs.
- `createScroll` returns the six scroll MotionValues. `options`, `container` and `target` are accessors; elements are resolved after mount, and the acceleration config (ScrollTimeline/ViewTimeline) is set by a render effect so it is in place before dependent values read it. Delegates to `scroll` from `framer-motion/dom`; nothing is tracked on the server.
- `createAnimate` returns `[scope, animate]`: `scope` is a Solid `ref` callback that also carries `current` / `animations`; animations stop on owner disposal and honour `MotionConfig`. `createAnimationControls` mounts its controls in `onSettled`. `createReducedMotion` uses `@solid-primitives/media`; `createPageInView` uses `@solid-primitives/page-utilities`.
- `createInView` wraps motion's `inView` (not `@solid-primitives/intersection-observer`) because it shares `amount` / `margin` / `root` semantics with the component. `createDomRef` is the `[element, ref]` pair for primitives that need an element accessor.
- `createAnimationFrame` uses motion's `frame.update`, not `@solid-primitives/raf`, so it runs in the same loop step as value animations.

## Ref-factory directive (`directive/`)

Solid 2 has no `use:` directives, so motion-vue's `v-motion` becomes `vMotion(options)`, a factory called in an owner that returns a `ref` callback. Two phases: the factory builds the options memo and update effects and registers cleanup; the returned callback only records the element; `onSettled` creates and mounts the `MotionState` and applies initial styles. `createMotionDirective(bundle?, defaults?)` and `createPresetDirective(preset, bundle?)` build variants. No parent-variant propagation (no parent state), no SSR (`getMotionSSRStyle` returns the initial style instead).

## Other components

- `LazyMotion` provides the bundle (object: synchronous; promise or loader function: when it resolves, through a boxed effect compute so Solid does not await it). `m` components read it and call `state.setBundle`. `strict` throws if a full `motion` component renders below it.
- `MotionConfig` merges parent config and provides an accessor.
- `AnimateView` / `startTransition` implement the View Transitions API wrapper (`animate-view/`), resolving elements with `@solid-primitives/refs`.
- `RowValue` renders a MotionValue as a text node updated in place.

## Build

`packages/motion/vite.config.ts`: `@solidjs/vite-plugin`, `vite-plugin-dts` (types to `dist/es`), ES output only, `preserveModules`, `@/` alias to `src`. Dependencies, peers, `solid-js*`, `@solidjs/*` and `framer-motion/dom` are external. The root `exports` map points at `dist/es/index.mjs`, so the playground needs a build first. A `prebuild` step copies the root `README.md`, `NOTICE` and `LICENSE` into `packages/motion` so they ship in the package (`files`), and `prepack` builds.

## Testing

Vitest with jsdom and `@solidjs/testing-library`, tests co-located in `__tests__/`. Solid 2 batches writes to a microtask: call `flush()` from `solid-js` after signal writes before asserting. jsdom has no layout or IntersectionObserver; tests that need an `offsetParent` or an observer stub them (see `animate-presence.test.tsx`). `src/__tests__/tree-shaking.test.ts` bundles `m` + `LazyMotion` + `domAnimation` with vite and asserts no drag, layout, reorder or `domMax` module contributes bytes (a `domMax` bundle is the control). `playground/vite` is typechecked and built by `pnpm --filter @motion-solid/playground-vite build`.
