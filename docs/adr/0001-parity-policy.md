# Parity policy: behavior 1:1 with Motion, Solid-idiomatic API canonical

motion-solid matches Motion's behavior and capabilities 1:1, because it runs Motion's own engine. Its public API follows the React version's components, props and semantics, but expressed the way Solid code is written, and that Solid-idiomatic form is canonical, not a gap. The concrete cases: primitives are `create*` instead of `use*` (`createScroll`, not `useScroll`), reactive inputs are accessors instead of re-rendered values, and `asChild` is `as`. No compatibility aliases are written. When upstream changes behavior we replace directly and note breaking changes in the changelog.

The package structure follows [motion-vue](https://github.com/motiondivision/motion-vue) path for path (`state/`, `features/`, `components/animate-presence/`, `value/`, `animation/`, …) so that upstream fixes in either project are easy to port. See [porting-contract.md](../agents/porting-contract.md) for the rules the port was built under.

## Parity with the core library

**One engine, not a fork.** The animation engine, gesture recognisers, layout projection, scroll tracking and spring physics are the upstream packages, consumed as dependencies and never copied or patched:

| Package | Version range | Role |
|---------|---------------|------|
| `framer-motion` | `~14.14.0` | `framer-motion/dom` helpers (`animate`, `scroll`, `inView`, `stagger`, easings, …) |
| `motion-dom` | `~14.14.0` | visual elements, projection, gestures, motion values, animation engine |
| `motion-utils` | `~14.7.0` | shared math, easing and error utilities |

These three move together; bump them in one change. `src/dom.ts` is an explicit re-export of `framer-motion/dom` (not `export *`) so that no name collides with `solid-js` or `@solidjs/web`; it deliberately omits `createEffect` (motion-dom's frame-sync helper) and `memo`. Regenerate it when `framer-motion` is upgraded; `src/__tests__/exports.test.ts` fails if a collision slips in.

**What is ours.** Everything between the engine and Solid: the `MotionState` lifecycle owner, the `motion` / `m` / `Motion` components, context wiring, `AnimatePresence` (built on `@solid-primitives/transition-group` and adapted to wait for motion's exit animations), `Reorder`, `LayoutGroup`, `AnimateView`, the `create*` primitives and the ref factories. `state/`, `features/` and `events/` come from motion-vue and keep its logic; Solid-specific lifecycle timing lives in `components/motion/use-motion-state.ts`.

**Behavior is the contract.** Where React and motion-vue behave differently, the public behavior follows React (it is the reference implementation of Motion) and the internal structure follows motion-vue. A behavior difference from React is a bug unless it is listed under [Intentional differences](#intentional-differences).

**Upgrading Motion.**

1. Bump `framer-motion`, `motion-dom` and `motion-utils` together.
2. Regenerate `src/dom.ts`, then run `pnpm --filter motion-solid build && pnpm --filter motion-solid parity` and read what changed (see [Export parity](#export-parity-snapshot)).
3. Port the upstream change to any adapter that wraps it (`MotionState`, features, presence, reorder).
4. Replace directly. No deprecation shims or aliases; record the break in the changelog.

## Naming: `create*` vs `use*`

Solid names things by what they do, and `use*` already means something in Solid: a **context consumer** (`useContext`, `useNavigate`). React hooks are the opposite case: every hook, whether it reads context or creates state, is `use*` because React needs that prefix to enforce its rules. Solid has no rules of hooks, so the prefix carries meaning instead.

| Kind | Prefix | Examples |
|------|--------|----------|
| **Primitive**: creates reactive state or subscriptions and is cleaned up with the owner that created it | `create*` | `createMotionValue`, `createTransform`, `createSpring`, `createScroll`, `createAnimate`, `createInView`, `createDragControls` |
| **Imperative primitive**: acts immediately, non-reactive, returns a function that undoes it (and is undone with the owner), as `makeEventListener` in Solid Primitives | `make*` | `makeMotion` |
| **Context consumer**: reads a provided value | `use*` | `useMotionContext`, `useMotionConfig`, `useLayoutGroupContext`, `useAnimatePresenceContext`, `useLazyMotionContext`, `useReorderContext` |
| **Pure helper**: no owner, no reactivity | plain name | `animate`, `scroll`, `inView`, `stagger`, `spring`, `cubicBezier`, `delayInMs` |
| **Component** | `PascalCase` | `motion.div`, `AnimatePresence`, `Reorder.Group` |

Rules that follow:

- **`make*` follows Solid Primitives.** `makeMotion(element, options)` attaches motion to an element you already have, takes plain (non-reactive) options, registers its cleanup with the current owner and returns a disposer. Its reactive counterpart is the `attachMotion` ref factory with an accessor. Do not use `make*` for anything that reads signals or returns a ref.
- **No `use*` aliases.** `useScroll` is not exported next to `createScroll`. Two names for one thing split documentation, examples and search results, and the React migration is a mechanical find-and-replace. `exports.test.ts` fails if any exported identifier outside the context consumers starts with `use`.
- **A `create*` primitive must be called in an owned scope** (a component body, `createRoot`, an effect compute) because its cleanup registers with the owner. The non-owned counterpart, when React has one, keeps its plain name: `animationControls()` next to `createAnimationControls()`.
- **Internal file names keep motion-vue's `use-*.ts`** (`value/use-scroll.ts` exports `createScroll`). Folder and file parity makes cross-porting easy; only the exported identifiers are renamed. New files use `create-*.ts`.
- **Names that would collide with Solid are renamed, not re-exported.** `useComputed` is `createComputedMotionValue` (Solid 1.x had a `createComputed`, and Solid 2.0 removed it), and `createContext` is internal. No export of this package may share a name with a `solid-js` or `@solidjs/web` export.

### Rename map

Every React primitive exported by `framer-motion` 14.14 maps by swapping `use` for `create`, with these exceptions in bold:

| React | motion-solid |
|-------|--------------|
| `useMotionValue`, `useTransform`, `useSpring`, `useScroll`, `useVelocity`, `useMotionTemplate`, `useMotionValueEvent`, `useTime`, `useFollowValue`, `useAnimationFrame` | `create` + same name |
| `useAnimate`, `useDragControls`, `useInView`, `usePageInView`, `useReducedMotion`, `useReducedMotionConfig`, `useCycle`, `useWillChange`, `useInstantTransition`, `useInstantLayoutTransition`, `useResetProjection`, `useViewportScroll`, `useElementScroll`, `useScopeMotion` | `create` + same name |
| `usePresence`, `useIsPresent`, `usePresenceData` | `createPresence`, `createIsPresent`, `createPresenceData` |
| **`useAnimation`**, `useAnimationControls` | **both are `createAnimationControls`** |
| **`useComputed`** | **`createComputedMotionValue`** |
| `PresenceContext` | `AnimatePresenceContext` (consumed with `useAnimatePresenceContext()`) |
| `UseInViewOptions`, `UseScrollOptions`, `UseScopeMotionOptions` | `CreateInViewOptions`, `CreateScrollOptions`, `CreateScopeMotionOptions` (the React names are also exported as type-only aliases, see below) |
| `HTMLMotionProps<'div'>`, `SVGMotionProps<'svg'>` | type-only aliases of `MotionComponentProps<tag>` (the props of a motion element, including the element's own attributes) |
| `ScrollMotionValues` | type-only alias of `ReturnType<typeof createScroll>` |

The type-only aliases (`HTMLMotionProps`, `SVGMotionProps`, `UseInViewOptions`, `UseScrollOptions`, `UseScopeMotionOptions`, `ScrollMotionValues`) exist only so React type annotations keep compiling. They carry no runtime value, so the "no `use*` aliases" rule for primitives is unaffected. The native Solid names are canonical in docs and examples. `transitionEnd` is accepted in `animate`, `exit`, `initial` and variants (`VariantType`), as in React.

## Intentional differences

These are deliberate. Readers comparing this API with the React docs should expect them.

**Reactivity**

- **Reactive inputs are accessors.** React re-runs a hook on every render, so it takes plain values. Solid components run once, so anything that can change is passed as `() => value` or a plain value (`MaybeAccessor<T>` from `@solid-primitives/utils`). Primitives return `MotionValue`s, not accessors, unless documented: `createInView(el)` returns an accessor, `createScroll()` returns an object of motion values.
- **Props are read through `props.x`.** They are reactive in JSX and effects and must not be destructured. Motion components apply prop changes to the existing element; nothing re-renders.
- **Children are tracked by identity, not `key`.** `AnimatePresence` follows what Solid renders (`<Show>`, keyed `<For>`) rather than React `key`. A `<Show>` branch that turns false plays its `exit`, and a `<For>` item that leaves the list does the same.
- **Motion owns animated styles.** Solid sets the initial style once (so SSR output carries the `initial` values) and re-applies only when the user's own `style` prop changes. On plain DOM elements Solid's `style` takes string lengths (`"100px"`); on motion elements numbers are accepted and converted by Motion.

**Components and props**

- **`asChild` is not supported.** Solid has no slot cloning. Use `as` (a tag or a component) with the normal `ref`.
- **`motion.create(Component)` and `<Motion as="…">`** both exist, as in motion-vue.
- **Prop aliases.** Motion's internal names (`whilePress`, `onPress*`, `globalPressTarget`, `inViewOptions`) and React's (`whileTap`, `onTap*`, `globalTapTarget`, `viewport`) are both accepted. When both are given the internal name wins.
- **Reorder keeps React's `onReorder`.** motion-vue replaced it with `update:values` for `v-model`; Solid has no `v-model`, so `onReorder` is the idiomatic form. `Reorder.Group` and `Reorder.Item` are exported as the `Reorder` namespace, as in React.
- **`AnimatePresence` extras.** It accepts a non-React `as` prop to render a wrapper element (React renders none). `mode`, `initial`, `custom`, `onExitComplete`, `propagate`, `presenceAffectsLayout`, `anchorX`, `anchorY` and `root` match React.
- **`fx`** (from motion-vue) renders a marker attribute for fx stylesheets.
- **`v-motion` is a ref factory.** Solid 2.0 removed `use:` directives, so motion-vue's `v-motion` directive becomes `ref={attachMotion({ animate: { x: 100 } })}` (also `createAttachMotion(bundle)` and `createPresetMotion(defaults)`), plus the imperative `makeMotion(element, options)` for elements you create or receive yourself. The names deliberately do not echo `v-motion`: `v-` is Vue's directive prefix and means nothing in Solid. It has no parent-variant propagation and no SSR. `MotionPlugin` is Vue-specific and is not ported.

**Primitives**

- **`createSpring` drives a `MotionValue`** with Motion's spring physics, so it composes with `createTransform`, style bindings and the motion frame loop. `@solid-primitives/spring` and `tween` animate plain signals and are deliberately not used for this.
- **`createInView` wraps Motion's `inView`** (not `@solid-primitives/intersection-observer`) so `amount`, `margin`, `root` and `once` behave exactly as `whileInView` does, including its animation-scope binding.
- **`createAnimationControls` needs an owner**, since it registers cleanup with it. Use `animationControls()` outside components.
- **`createInstantLayoutTransition`** also runs its callback when no layout tree exists yet (React skips it silently), so the caller's update is never lost.
- **`AnimateView` has no reconciler signal.** Components that neither enter, exit nor re-render are not detected as view-transition participants, so their group layer uses the browser's default timing. React's `<ViewTransition>` can see these through its reconciler.

**Packaging**

- **Single entry point.** React splits `framer-motion` / `motion/react` / `framer-motion/m` / `motion/react-client`. motion-solid has one entry; tree-shaking comes from `m` + `LazyMotion` with `domAnimation` / `domMax` / `domMin`, and a test guards that `m` + `domAnimation` does not pull in drag or layout.
- **Engine classes are Motion's, not the binding's.** `Feature`, `PanSession`, `VisualElementDragControls` and `elementDragControls` exported from the root (via `framer-motion/dom`) are `motion-dom`'s. motion-solid runs its own adapted copies under `src/features/`, so a component's `drag` prop never registers in the exported `elementDragControls` (only the plain `drag(el)` function does), and extending the exported `Feature` or `PanSession` does not affect what the components run. Treat them as the standalone DOM engine.
- **Motion's dev-only `warning()` / `invariant()` are silent in a plain browser app.** `motion-utils` enables them only when `process.env.NODE_ENV` is readable, so without a bundler `process` define they neither print nor throw, including for any motion-solid dev check that goes through them.
- **Requires Solid ≥ 2.0** (`solid-js` and `@solidjs/web` as peers). There is no Solid 1.x support.

## Solid Primitives policy

Before writing a utility, subscription, observer, ref merge or timing helper, check whether a Solid Primitive already provides it and use it. Only write your own when none fits, and say why in the code comment. The package depends on `@solid-primitives/utils` (`access`, `MaybeAccessor`, `noop`, …), `event-listener`, `media` (reduced motion), `mutation-observer` (`AnimateView` update detection), `refs` (`mergeRefs`) and `transition-group` (the presence engine). Where one was evaluated and rejected (for example `createInView`, page visibility in `createPageInView` (`@solid-primitives/page-utilities` creates its signal only on the client, which shifts hydration ids), scroll-parent lookup in Reorder auto-scroll, `@solid-primitives/spring`), the reason is documented next to the code.

## Export parity snapshot

Generated by `pnpm --filter motion-solid parity` against `framer-motion` 14.14.0's React types (725 exports):

| | Count |
|---|---|
| Exported under the same name | 661 |
| Exported under a `create*` name | 29 |
| Not exported | 35 |
| motion-solid only | 94 |

The 35 not exported fall into these groups:

- **React-only or deprecated:** `AnimateSharedLayout`, `DeprecatedLayoutGroupContext`, `SwitchLayoutGroupContext`, `useDeprecatedAnimatedState`, `useDeprecatedInvertedScale`, `ForwardRefComponent`.
- **React rendering internals:** `PopChild`, `PresenceChild`, `makeUseVisualState`, `filterProps`, `isBrowser`, `useComposedRefs`, `useForceUpdate`, `useIsomorphicLayoutEffect`, `useUnmountEffect`, `CreateVisualElement`, the `Feature*` / `LazyFeatureBundle` / `LazyProps` types, `animations`, `pinchFeatures`. motion-solid has its own feature bundles (`domMin`, `domAnimation`, `domMax`) and presence implementation.
- **Not ported yet:** `useAnimateMini`, `useDomEvent`, `startOptimizedAppearAnimation` and the `MotionTransform`, `DOMMotionComponents` and `ResolveKeyframes` types. These are gaps, not policy; add them when needed.
- **Renamed, reported as not exported by the script:** `PresenceContext` is `AnimatePresenceContext` here (see the rename map).
- **Deliberately omitted (collisions with Solid):** `createEffect`, `memo`. Import from `motion-dom` / `motion-utils` directly if needed.

## Considered Options

- **Keep React's `use*` names for familiarity** — rejected: `use*` is Solid's context-consumer prefix, so using it for primitives breaks Solid's own convention and makes `useMotionConfig` (reads context) and `useScroll` (creates subscriptions) indistinguishable. React users migrate with a find-and-replace; Solid users get names that match every other Solid library.
- **Export both `use*` and `create*`** — rejected: two names per API doubles docs and search noise and invites drift. The maintainer must ask explicitly before any alias layer is added.
- **Re-implement the engine in Solid-native signals** — rejected: it would diverge from Motion's behavior and need re-porting on every upstream release. Parity is cheap only because the engine is shared.
- **Fork the three Motion packages** — rejected for the same reason; adapters stay thin so upgrades are a version bump plus a review.
- **Mirror React's single-component-per-file structure** — rejected: the folder layout follows motion-vue (and its tests) so ports between the two framework adapters stay mechanical.

## Consequences

- Future ports apply the same rule: port behavior 1:1, express it in Solid idioms (`create*`, accessors, `ref`, context), and never add compatibility layers unless the maintainer explicitly asks.
- A reader comparing this API with React's documentation should expect differences of the kinds listed above. They are deliberate, not omissions; the exceptions that are real gaps are named under "Not ported yet".
- The export count and rename map are reproducible: run `pnpm --filter motion-solid build && pnpm --filter motion-solid parity` after any upstream bump and update this document's snapshot if the numbers move.
- Documentation and examples use `create*` names throughout; a `use*` primitive appearing anywhere is a bug.
