# motion-solid playground (Vite)

Manual-test and smoke-test bench for motion-solid. Imports the library from the workspace build
(`packages/motion/dist`). From the repo root, `pnpm play` builds the library and starts the playground; running `pnpm dev` here needs
`pnpm build` at the root first (it stops with a clear message if the build is missing).
To run against the TypeScript sources instead, with no build step and hot reload of the library:
`MOTION_SOLID_ENTRY=../../packages/motion/src/index.ts pnpm dev`.

```
pnpm dev        # http://localhost:5173
pnpm build      # tsc --noEmit && vite build
pnpm coverage   # export coverage report (exits non-zero while anything is uncovered)
pnpm smoke      # headless Chromium visits every demo, clicks every button, fails on any diagnostic
pnpm smoke cumulative/foo   # optional substring filters
```

## Demo contract

One self-contained file per demo: `src/demos/<group>/<id>.tsx`, where `<group>` is one of
`reference | cumulative | integration | stress` and `<id>` is `a-z0-9-` and equals `meta.id`.
Import only `solid-js`, `@solidjs/web`, `motion-solid` and the optional `../../ui` helpers
(`Stage`, `Controls`, `Button`, `Readout`).

```tsx
export const meta = {
  id: 'basic',
  title: 'Basic animate',
  group: 'reference',
  description: 'One sentence on what to try.',
  covers: ['motion'],          // literal string array: exports the demo genuinely uses
  level: 1,                    // optional, sorts within a group
  expects: ['is deprecated'],  // optional: substrings of dev warnings this demo triggers on purpose
} as const

export default function Demo() { /* ... */ }
```

`covers` is audited: `pnpm coverage` fails if a listed export never appears in the demo's code outside `meta` and the import line.
`expects` lists diagnostics the demo provokes deliberately (a deprecation or reduced-motion hint it demonstrates); they are shown in the panel but
not counted as failures by the badge or `pnpm smoke`.

`src/registry.ts` finds demos with `import.meta.glob`; nothing central is edited. Route is
`#/<group>/<id>`. Registry mistakes (id/group not matching the path, missing exports) show in the sidebar.

## Shell features

- Sidebar grouped by `group`, with search over title, description and `covers`.
- **Remount** re-mounts the demo and starts a fresh diagnostics scope.
- Diagnostics panel and sidebar badge: page errors, unhandled rejections, `console.error`/`console.warn`
  and Solid diagnostics (`OBSERVE.diagnostics`, warn/error counted) since the demo mounted.
- **reduced motion** (`default|user|always|never`) and **skip animations** wrap the demo in `MotionConfig`.
  There is no supported global slow-motion switch in motion-solid, so none is offered.

## Coverage

`scripts/coverage.mjs` lists runtime exports of the built `dist/es/index.mjs`, statically parses every demo's
`meta.covers`, and fails on: uncovered exports, allowlisted-but-covered exports, stale allowlist entries,
and `covers` names that are not real exports. `coverage.allowlist.json` takes `"<export>": "<specific reason>"`
or `"<key>": { "group": ["a","b"], "reason": "..." }`. Only exports that cannot be demonstrated in a browser belong there.

## Smoke

`e2e/smoke.mjs` starts Vite on a free port itself, opens each demo, clicks every `button` inside the demo root
once, then reads the diagnostics badge. Any counted entry fails the run.
