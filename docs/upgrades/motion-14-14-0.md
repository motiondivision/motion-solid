# Motion 14.14.0 baseline

motion-solid starts from Motion 14.14.0: `framer-motion` `~14.14.0`, `motion-dom` `~14.14.0`, `motion-utils` `~14.7.0` (see [packages/motion/package.json](../../packages/motion/package.json)). This note records how the 14.13.0 → 14.14.0 changes (the [upstream compare](https://github.com/motiondivision/motion/compare/v14.13.0...v14.14.0)) are reflected in the Solid binding, and is the template for later upgrade notes. It follows the format of motion-vue's `docs/upgrades/motion-14-14-0.md`.

## Per-change assessment

| Upstream change | Assessment | Solid implementation and evidence |
| --- | --- | --- |
| Boolean `fx` marker | Supported | `fx?: boolean` is declared on [MotionProps](../../packages/motion/src/components/motion/types.ts). The component factory in [utils.tsx](../../packages/motion/src/components/motion/utils.tsx) normalizes it so that `true` renders a bare marker attribute and `false` or omitted renders nothing. Tests: [render.test.tsx](../../packages/motion/src/components/motion/__tests__/render.test.tsx) (client) and [ssr.test.tsx](../../packages/motion/src/components/motion/__tests__/ssr.test.tsx) (server). |
| React `LazyMotion` async hydration scheduling | Not needed | Upstream wraps provider updates in React's `startTransition`. Solid's [LazyMotion](../../packages/motion/src/components/lazy-motion/index.tsx) always renders its children. A feature bundle object applies synchronously (so SSR and hydration render with it), and a promise or loader applies when it resolves through a signal that `m` components read through context. |
| `framer-motion` and `motion-dom` versions | Adopted | Both at `~14.14.0`. |
| `motion-utils` version | Already supported | Upstream keeps 14.7.0; the package stays at `~14.7.0`. |
| `claimTarget` and shaders | Not needed | Upstream added then removed them inside the range; the net change does not include them. |
| Other internal exports and integration paths | Not needed | No new barrel exports. [src/dom.ts](../../packages/motion/src/dom.ts) is an explicit re-export list of `framer-motion/dom`; it was generated against 14.14.0 and a test guards name collisions with Solid. |
| Upstream bundle budgets | Not carried over | motion-vue enforces per-entry byte budgets; motion-solid currently guards tree-shaking structure only ([tree-shaking.test.ts](../../packages/motion/src/__tests__/tree-shaking.test.ts): `m` + `LazyMotion` + `domAnimation` pulls in no drag, layout or `domMax` code). Byte budgets are a known gap. |

## How the `fx` marker behaves

`fx` is a selector marker rendered by the component. It is a Boolean prop:

```tsx
import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'

export function Marked() {
  const [enabled] = createSignal(true)
  return <motion.div fx={enabled()} />
}
```

## Checklist for the next upgrade note

Copy this file to `docs/upgrades/motion-<major>-<minor>-<patch>.md`, set the baseline commit and the upstream compare link, then:

1. **List the upstream changes** from the compare view and the changelog, one row each.
2. **Assess each row** as one of: *Must follow*, *Recommended*, *Not needed*, *Already supported*. Link the upstream commit and the Solid file that implements or deliberately ignores it.
3. **Bump** `framer-motion`, `motion-dom` and `motion-utils` together; the lockfile should change only for those packages.
4. **Regenerate** `src/dom.ts`, then run `pnpm --filter motion-solid build && pnpm --filter motion-solid parity` and record any change in the export snapshot in [ADR-0001](../adr/0001-parity-policy.md).
5. **Port** the change to the adapters that wrap it (`MotionState`, features, presence, reorder) and add a test that fails without it.
6. **Run** `pnpm typecheck`, `pnpm build` and `pnpm test`, and rebuild the playground.
7. **Record breaks** in the changelog. Replace directly; add no compatibility aliases (ADR-0001).
