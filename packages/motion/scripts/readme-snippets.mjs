/* Renders every ```tsx block of the root README in jsdom against src/ with Solid's diagnostics
 * capture on, and fails on any warning or error. Keeps the documentation honest:
 *
 *   pnpm --filter motion-solid docs:check
 *
 * The generated files live in src/__docs_check__ (git-ignored) and are removed afterwards. */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..')
const readme = readFileSync(join(pkg, '../../README.md'), 'utf8')
const blocks = [...readme.matchAll(/```tsx\n([\s\S]*?)```/g)].map(m => m[1])
const dir = join(pkg, 'src/__docs_check__')
const config = join(pkg, 'vitest.docs.config.ts')

rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })
blocks.forEach((code, i) => writeFileSync(join(dir, `snippet-${String(i).padStart(2, '0')}.tsx`), code))
writeFileSync(join(dir, 'docs.test.tsx'), `import { afterEach, describe, expect, it } from 'vitest'
import { OBSERVE, flush } from 'solid-js'
import { cleanup, render } from '@solidjs/testing-library'

// jsdom has no IntersectionObserver; browsers do.
class FakeIO { constructor(public cb: unknown) {} observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } }
;(globalThis as any).IntersectionObserver = FakeIO

const modules = import.meta.glob('./snippet-*.tsx', { eager: true }) as Record<string, Record<string, unknown>>

describe('README snippets', () => {
  afterEach(cleanup)
  for (const [file, mod] of Object.entries(modules)) {
    const components = Object.entries(mod).filter(([, v]) => typeof v === 'function')
    it(file + ' renders without diagnostics', async () => {
      expect(components.length).toBeGreaterThan(0)
      for (const [name, Component] of components) {
        const cap = OBSERVE!.diagnostics.capture()
        const { unmount } = render(() => (Component as () => unknown)() as never)
        flush()
        await new Promise(r => setTimeout(r, 30))
        flush()
        unmount()
        await new Promise(r => setTimeout(r, 10))
        const found = cap.stop().filter(e => e.severity !== 'info').map(e => file + ' ' + name + ': [' + e.code + '] ' + e.message.slice(0, 160))
        expect(found).toEqual([])
      }
    })
  }
})
`)
writeFileSync(config, `import { defineConfig } from 'vitest/config'
import solid from '@solidjs/vite-plugin'
import path from 'node:path'

export default defineConfig({
  plugins: [solid()],
  test: { environment: 'jsdom', globals: true, include: ['src/__docs_check__/**/*.test.tsx'] },
  resolve: { alias: { 'motion-solid': path.resolve(import.meta.dirname, 'src/index.ts'), '@': path.resolve(import.meta.dirname, 'src') } },
})
`)
console.log(`readme-snippets: ${blocks.length} tsx blocks`)
const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.docs.config.ts'], { cwd: pkg, stdio: 'inherit' })
rmSync(dir, { recursive: true, force: true })
rmSync(config, { force: true })
process.exit(result.status ?? 1)
