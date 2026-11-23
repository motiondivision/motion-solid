# Changelog

All notable changes to `motion-solid` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Breaking changes are replaced directly, with no
compatibility aliases (see [ADR-0001](https://github.com/motiondivision/motion-solid/blob/main/docs/adr/0001-parity-policy.md)).

## [2.0.0] - Unreleased

First release. The major version tracks Solid: 2.x of `motion-solid` is for Solid 2.0 (`solid-js` and `@solidjs/web` `>=2` are peer
dependencies; Solid 1.x is not supported). It is a Solid 2.0 binding for Motion 14.14 (`framer-motion` / `motion-dom` `~14.14.0`,
`motion-utils` `~14.7.0`) with the public interface of the React version and the folder structure of motion-vue.

### Added

- `motion.*`, `Motion`, `motion.create`, `m` with `LazyMotion` (`domMin`, `domAnimation`, `domMax`), `MotionConfig`,
  `AnimatePresence` (`sync`, `wait`, `popLayout`), `LayoutGroup`, `Reorder`, `RowValue`, `AnimateView` and
  `startTransition`.
- `create*` primitives: `createMotionValue`, `createTransform`, `createSpring`, `createFollowValue`, `createScroll`,
  `createVelocity`, `createMotionTemplate`, `createMotionValueEvent`, `createTime`, `createAnimationFrame`,
  `createAnimate`, `createAnimationControls`, `createDragControls`, `createInView`, `createReducedMotion`,
  `createPresence`, `createIsPresent`, `createPresenceData`, `createCycle`, and the rest listed in the
  [parity ADR](https://github.com/motiondivision/motion-solid/blob/main/docs/adr/0001-parity-policy.md).
- Layout animations for `<For>` reorders, `<Show>` toggles and signal-driven size changes, through a layout
  coordinator (cached layouts plus `MutationObserver` / `ResizeObserver`).
- `isStatic` support on `MotionConfig`.
- Attach motion to elements that are not motion components: the `attachMotion` ref factory (with `createAttachMotion` for a
  chosen feature bundle and `createPresetMotion` for presets), and `makeMotion(element, options)`, an imperative `make*`
  primitive in the style of `makeEventListener` that returns a function to remove it.
- Server rendering and hydration for motion components and `AnimatePresence`.
- Tooling: `pnpm parity` (export parity report against React's `framer-motion`), `pnpm docs:check` (README snippets),
  and a playground with a demo for every runtime export (`pnpm coverage`, `pnpm smoke`).

### Differences from the React version

Reactive inputs are accessors, primitives are `create*` (`use*` is reserved for context consumers), and `asChild` is
`as`. The full list is in [ADR-0001](https://github.com/motiondivision/motion-solid/blob/main/docs/adr/0001-parity-policy.md).

### Fixed

- `whileInView`, `onViewportEnter` and `onViewportLeave` now start observing when they are first set after mount, and
  stop (leaving the in-view state) when the last of them is removed (#1).
- `attachMotion` and `createAttachMotion` no longer treat camelCase SVG elements (`radialGradient`, `clipPath`,
  `feGaussianBlur`, `textPath`, …) as HTML, so their SVG attributes are written (#2).
- `createInView(scope)` and `createScopeMotion(scope, …)` accept the scope returned by `createAnimate`: an
  `ElementInput` can now be a function carrying `current` (#3).
- `createScopeMotion(() => el, …)` resolves a plain, non-reactive accessor or `{ current }` again after mount (#4).

### Known limitations

- The package is not published yet. The `motion-solid` name on npm belongs to a different library, so the final
  published name is undecided (#5).
- `AnimatePresence` `mode="wait"`: the entering child's component body runs when its source changes; only what it
  schedules is held until the exit finishes.
- The value primitives (`createMotionValue`, `createSpring`, `createAnimationFrame`) do not read `isStatic` yet.
- Not ported: `useAnimateMini`, `useDomEvent`, `startOptimizedAppearAnimation` and a few React-only type names.
