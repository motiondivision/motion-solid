import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import solid from '@solidjs/vite-plugin'

// Default: consume motion-solid from the workspace build (packages/motion/dist; run the
// package build first). Set MOTION_SOLID_ENTRY=/abs/path/to/entry to alias it elsewhere
// (e.g. the TypeScript sources: MOTION_SOLID_ENTRY=../../packages/motion/src/index.ts).
const entry = process.env.MOTION_SOLID_ENTRY ? resolve(process.env.MOTION_SOLID_ENTRY) : undefined

// Fail early with a useful message instead of Vite's "Failed to resolve import "motion-solid"".
const built = resolve(import.meta.dirname, '../../packages/motion/dist/es/index.mjs')
if (!entry && !existsSync(built)) {
  throw new Error(
    `motion-solid has not been built (missing ${built}).\n`
    + 'Run `pnpm build` at the repo root first, or start the playground with `pnpm play`, which builds first.\n'
    + 'To use the TypeScript sources instead: MOTION_SOLID_ENTRY=../../packages/motion/src/index.ts pnpm dev',
  )
}

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5173,
    fs: { allow: ['../..'] },
  },
  resolve: {
    // The library sources import through `@/` (its own `src`), so alias it when they are used directly.
    alias: entry
      ? { 'motion-solid': entry, '@': resolve(import.meta.dirname, '../../packages/motion/src') }
      : {},
    // One copy of the reactive runtime, whichever motion-solid entry is used.
    dedupe: ['solid-js', '@solidjs/web'],
  },
  optimizeDeps: { exclude: ['motion-solid'] },
})
