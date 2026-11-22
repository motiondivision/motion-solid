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
- Ref-factory directive: `vMotion`, `createMotionDirective`, `createPresetDirective`.
- Server rendering and hydration for motion components and `AnimatePresence`.
- Tooling: `pnpm parity` (export parity report against React's `framer-motion`), `pnpm docs:check` (README snippets),
  and a playground with a demo for every runtime export (`pnpm coverage`, `pnpm smoke`).

### Differences from the React version

Reactive inputs are accessors, primitives are `create*` (`use*` is reserved for context consumers), and `asChild` is
`as`. The full list is in [ADR-0001](https://github.com/motiondivision/motion-solid/blob/main/docs/adr/0001-parity-policy.md).

### Known limitations

- `AnimatePresence` `mode="wait"`: the entering child's component body runs when its source changes; only what it
  schedules is held until the exit finishes.
- The value primitives (`createMotionValue`, `createSpring`, `createAnimationFrame`) do not read `isStatic` yet.
- Not ported: `useAnimateMini`, `useDomEvent`, `startOptimizedAppearAnimation` and a few React-only type names.
