# Porting contract: motion-vue → motion-solid

This repo is a **Solid 2.0** binding for Motion. It has the **public interface of the React
version** (`framer-motion` / `motion/react`) and the **folder structure of
[motion-vue](https://github.com/motiondivision/motion-vue)** (`packages/motion/src/...`).

References (read-only, cloned in scratch dirs; do not edit, do not run code from inside them):
- `/tmp/ref/motion-vue/packages/motion/src` — structure to mirror, and the Vue-specific code to port.
- `/tmp/ref/motion/packages/framer-motion/src` — the React API and semantics (source of truth for behaviour).
- `~/.claude/skills/solid/SKILL.md` — **Solid 2.0 reference. Read the sections you need before writing Solid code.** Solid 2.0 differs from 1.x in ways models routinely get wrong.
- `node_modules/solid-js/skills/*` (under `packages/motion/node_modules`) — shipped, authoritative for 2.0.3.

## Layout rules

1. `packages/motion/src` mirrors motion-vue's tree path-for-path. Same directories, same file names,
   `.vue` single-file components become `.tsx` files, composables `use-*.ts` stay `use-*.ts`.
   Keep tests co-located in `__tests__/` (vitest + `@solidjs/testing-library`).
2. Files that never touched Vue were copied verbatim (`state/`, `features/`, `events/`, parts of
   `utils/`, `types/`). Keep them verbatim unless they reference Vue or a Vue-only concept.
3. Package name `motion-solid`; peer deps `solid-js >=2` and `@solidjs/web >=2`; runtime deps on
   `framer-motion`, `motion-dom`, `motion-utils` as in motion-vue (same versions).
4. The `@/` alias maps to `packages/motion/src`.
5. Own **only your assigned folders**. Do not edit another agent's files; if you need a change
   there, say so in your report. The root `src/index.ts` and folder barrels outside your
   assignment are the integrator's.

## Public API (React props and semantics, Solid naming)

Component names and props match React (`motion.div`, `AnimatePresence`, `LayoutGroup`, `MotionConfig`,
`Reorder.Group/Item`, `LazyMotion`, `m`). **Primitive names follow Solid standards, not React's:**

- **`create*` for primitives** (anything that creates reactive state/subscriptions and is cleaned up with its owner).
  React's `use*` hooks are renamed; no `use*` aliases are exported.
- **`use*` is reserved for context consumers**, as in Solid itself (`useContext`, `useNavigate`):
  `useMotionContext`, `useMotionConfig`, `useLayoutGroupContext`, `useAnimatePresenceContext`, `useLazyMotionContext`, `useReorderContext`.
- Pure helpers keep plain names (`animate`, `scroll`, `inView`, `stagger`, `spring`, `cubicBezier`, … re-exported from `framer-motion/dom`).

| React | Solid (this package) |
|-------|----------------------|
| `useMotionValue` | `createMotionValue` |
| `useTransform` | `createTransform` |
| `useSpring` | `createSpring` (motion's spring physics on a MotionValue; not `@solid-primitives/spring`, which animates a plain signal — see policy) |
| `useScroll` | `createScroll` |
| `useVelocity` | `createVelocity` |
| `useMotionTemplate` | `createMotionTemplate` |
| `useMotionValueEvent` | `createMotionValueEvent` |
| `useTime` | `createTime` |
| `useAnimationFrame` | `createAnimationFrame` |
| `useAnimate` | `createAnimate` |
| `useAnimation` / `useAnimationControls` | `createAnimationControls` (and `createAnimation` alias is NOT exported) |
| `useDragControls` | `createDragControls` |
| `useInView` | `createInView` |
| `useReducedMotion` | `createReducedMotion` |
| `usePresence` / `useIsPresent` / `usePresenceData` | `createPresence` / `createIsPresent` / `createPresenceData` (import `@solid-primitives/presence` as `createPresence as createSolidPresence` if needed) |
| `useCycle` | `createCycle` |
| `useAnimationControls` scope helper `useScopeMotion` (motion-vue) | `createScopeMotion` |
| `useMotionValue` in motion-vue's root export | `createMotionValue` |
| `use-layout-group` (internal hook) | `createLayoutGroup` |
| `ref` forwarding | Solid `ref` prop (callback or array) works on motion components |
| `children` | Solid children |
| React `key` | not applicable; AnimatePresence keys on child identity |

File names mirror motion-vue and so keep their `use-*.ts` names where motion-vue has them (the *folder
structure* is motion-vue's); only the exported identifiers are renamed. New files you add use `create-*.ts`.

**Reactive inputs.** React hooks take plain values and re-run on render. Solid has no re-render, so
anything that can change over time is passed as an **accessor** (`() => T`) or a plain value
(`MaybeAccessor<T>` and `access()` come from `@solid-primitives/utils`; re-export the type from `types/common.ts`
rather than redefining it). Primitives return `MotionValue`s (not accessors) unless noted. Component props
are read through `props.x` inside tracking scopes; never destructure props.

## Solid Primitives policy — do not recreate what exists

This package depends on **Solid Primitives 2.0** (`@solid-primitives/*`, all on their `latest` tag with a
`solid-js ^2` peer). **Before writing any utility, subscription, observer, event wiring, ref merging,
timing helper or context helper, check whether a Solid Primitive already provides it and use it.** Only
write your own when no primitive fits, and say why in your report (`deviationsFromContract`).
Already installed in `packages/motion` (add others with `pnpm --filter motion-solid add <pkg>`; the integrator
removes anything unused):

| Need | Use |
|------|-----|
| `MaybeAccessor`, `access`, `accessArray`, `asArray`, `clamp`, `noop`, `isServer`/`isClient`, `createCallbackStack`, `defer`, `tryOnCleanup`, `createMicrotask` | `@solid-primitives/utils` |
| DOM/window/document listeners with auto-cleanup (pointer, key, focus, resize, scroll) | `@solid-primitives/event-listener` (`makeEventListener`, `createEventListener`, `createEventListenerMap`) — gesture features that wrap motion-dom's own pointer helpers keep those (they are the engine), but any plain listener wiring in the binding layer uses the primitive |
| `createInView` | `@solid-primitives/intersection-observer` (`createVisibilityObserver`/`createViewportObserver`/`makeIntersectionObserver`) if it can honour once/amount/root/margin; otherwise wrap motion-dom `inView` and say why |
| element/window size, ResizeObserver | `@solid-primitives/resize-observer` |
| rAF loops (`createAnimationFrame`, `createTime`) | `@solid-primitives/raf` (`createRAF`, `createMs`, `targetFPS`) or motion's `frame` loop when sync with the motion frameloop matters (explain) |
| `createReducedMotion` | `@solid-primitives/media` (`createMediaQuery('(prefers-reduced-motion: reduce)')`) |
| page visibility (`usePageInView`) | `@solid-primitives/page-utilities` (`createPageVisibility`) |
| merging/forwarding refs, resolving children to elements | `@solid-primitives/refs` (`mergeRefs`, `resolveElements`, `resolveFirst`) |
| combining props / handlers / styles, splitting props | `@solid-primitives/props` (`combineProps`, `combineStyle`, `partitionProps`, `filterProps`) alongside Solid 2's `merge`/`omit` |
| presence/exit animation state and keeping children mounted while they leave | `@solid-primitives/transition-group` (`createListTransition`, `createSwitchTransition`) and `@solid-primitives/presence` (`createPresence`) — **AnimatePresence must be built on these, adapted to wait for motion `exit` animations**, not a from-scratch keep-alive engine |
| keyed lists | `@solid-primitives/keyed` (`keyArray`), `@solid-primitives/list` |
| mounted/hydrated flags | `@solid-primitives/lifecycle` (`createIsMounted`, `isHydrated`) |
| scroll position / scroll parent / prevent-scroll | `@solid-primitives/scroll` (`getScrollParent`, `createScrollPosition`, `createPreventScroll`) — Reorder auto-scroll uses it where applicable |
| root/disposal helpers (detached roots, branches, subroots) | `@solid-primitives/rootless` (`createSubRoot`, `createBranch`, `createDisposable`) |
| context + provider helpers | `@solid-primitives/context` (`createContextProvider`, `createOptionalContextProvider`) only if it simplifies; plain Solid 2 context is also fine |
| debounce/throttle, timers | `@solid-primitives/scheduled`, `@solid-primitives/timer` |
| memo helpers (`createWritableMemo`, `createLatest`, …) | `@solid-primitives/memo` |

Not a substitute (explain in `deviationsFromContract` if you consider them): `@solid-primitives/spring` / `tween`
animate plain signals; `createSpring` here drives a **MotionValue** with motion-dom's spring so it composes
with `createTransform`/style bindings and the motion frameloop.

## Solid 2.0 conventions (this repo is stable 2.0.3)

- Imports: `solid-js` (incl. stores), `@solidjs/web` (`render`, `dynamic`, `Portal`, `isServer`, `JSX` types). Never `solid-js/web`/`solid-js/store`.
- tsconfig: `jsx: preserve`, `jsxImportSource: @solidjs/web`.
- Split effects: `createEffect(compute, apply)` (never single-arg), `createRenderEffect` same.
  `onMount` → `onSettled`. `createComputed`, `batch`, `createResource`, `createMutable`, `Suspense`,
  `ErrorBoundary`, `Index`, `mergeProps`/`splitProps`, `classList`, `use:` directives, `unwrap` are **gone**
  (use `merge`/`omit`, `Loading`/`Errored`, `For`, `snapshot`, `ref` factories).
- Writes are batched until a microtask; use `flush()` in tests / when an imperative read must see them.
  No signal writes inside an owned scope (component body, memo, effect compute); write in event
  handlers, effect *apply*, `onSettled`, or use `{ ownedWrite: true }` for genuinely internal signals.
- Never read reactive state at the top level of a component body (`STRICT_READ_UNTRACKED`).
  **Never `untrack` to silence it.** Hooks and helpers take accessors and read them in their own memos/effects.
- Context: `const Ctx = createContext<T | null>(null)`; provide with `<Ctx value={v}>…</Ctx>`
  (no `.Provider`). A bare `createContext<T>()` throws outside a provider; use `null` for optional.
  Context values that change over time are provided as **accessors**.
- `dynamic(() => tag)` (from `@solidjs/web`) instead of `<Dynamic>`.
- `onCleanup` is allowed in component bodies, hook bodies and effect compute phases; in `onSettled`/apply
  return a cleanup function instead.
- Ref callbacks own nothing: create memos/effects in the factory/component body, not in the ref callback.
- Lifecycle map from Vue: `onMounted` → `onSettled`; `onBeforeUnmount`/`onUnmounted` → `onCleanup`
  in the component body; `onBeforeUpdate` → `createRenderEffect(compute, apply)`; `onUpdated` →
  `createEffect(compute, apply)`; `provide/inject` → context; `watch` → split effect; `computed` → memo;
  `ref()` → `createSignal`; `toValue(MaybeRefOrGetter)` → `access(MaybeAccessor)`.
- **Animated values must not be clobbered by Solid.** Motion writes `style`/attributes directly to the
  DOM from its frame loop. Solid must set the initial style once (and re-apply only when the user's
  `style` prop changes) — never re-set the whole `style` attribute from a signal that animation updates.

## Folder ownership and contracts

Contexts use Solid 2's `createContext` directly (`<Ctx value>`); `@solid-primitives/context` helpers may be used where they simplify. `utils/createContext.ts` (kept for path parity with motion-vue) is only a thin typed wrapper `createContext<T>(name, defaultValue?) => [useCtx(fallback?), Ctx]` around Solid's, giving a clear named error when no provider and no fallback.
Context modules export `XContext` (the Solid context) and `useXContext()` (`use*` is correct here: context consumers keep the `use` prefix):

| File | Exports |
|------|---------|
| `components/context.ts` | `MotionContext`/`useMotionContext(): MotionState \| null`, `LayoutGroupContext`/`useLayoutGroupContext(): LayoutGroupState` (`key` is an accessor) |
| `components/motion-config/context.ts` | `MotionConfigContext`/`useMotionConfig(): Accessor<MotionConfigState>` |
| `components/animate-presence/presence.ts` | `AnimatePresenceContext`/`useAnimatePresenceContext(): PresenceContext` |
| `components/lazy-motion/context.ts` | `LazyMotionContext`/`useLazyMotionContext(): { features: Accessor<MotionBundle>; strict: boolean }` |
| `components/reorder/context.ts` | `ReorderContext`/`useReorderContext()` |

`MotionState` (`state/motion-state.ts`) keeps its motion-vue API (`mount`, `unmount`, `beforeUnmount`,
`updateOptions`, `beforeUpdate`, `update`, `setBundle`, `isMounted`, `visualElement`, …). The Motion
component owns its lifecycle: create in the component body, `onSettled` → `state.mount(el)`,
split render-effect → `updateOptions` + `beforeUpdate`, effect → `update`, `onCleanup` → `beforeUnmount`/`unmount`
(skipping `unmount` while an AnimatePresence exit holds the element, as motion-vue does).

## Definition of done (per agent)

- Code compiles under `pnpm --filter motion-solid typecheck` for your files (other agents' missing
  modules may produce errors; do not paper over them with `any`-stubs in their folders).
- You consulted the Solid Primitives table and used a primitive wherever one fits (list each primitive you used in your report under `summary`).
- Co-located tests for your folder pass: `pnpm --filter motion-solid exec vitest run <path>`.
  Port the corresponding motion-vue tests (`__tests__`) to Solid where a counterpart exists; add tests for new behaviour.
- No Vue/React imports remain in your files. No `// TODO port` placeholders: implement it or list it in your report as a known gap.
- Report: files written, public exports added, deviations from the contract, known gaps, anything needed from other folders.
