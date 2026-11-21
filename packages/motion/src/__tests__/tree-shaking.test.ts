// @vitest-environment node
import { build } from 'vite'
import solid from '@solidjs/vite-plugin'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../..')
const entryId = '\0tree-shaking-entry'

/** Bundles `code` against the package source and returns rendered bytes per module id. */
async function bundle(code: string): Promise<Map<string, number>> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root,
    plugins: [
      solid(),
      {
        name: 'tree-shaking-entry',
        resolveId: id => (id === entryId ? id : null),
        load: id => (id === entryId ? code : null),
      },
    ],
    resolve: { alias: { '@': path.resolve(root, 'src') } },
    build: {
      write: false,
      minify: false,
      rolldownOptions: { input: entryId, external: [/^solid-js/, /^@solidjs\//] },
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => ('output' in item ? item.output : []))
  const modules = new Map<string, number>()
  for (const chunk of outputs) {
    if (chunk.type !== 'chunk') continue
    for (const [id, info] of Object.entries(chunk.modules) as [string, { renderedLength: number }][]) {
      modules.set(id.split(path.sep).join('/'), (modules.get(id.split(path.sep).join("/")) ?? 0) + info.renderedLength)
    }
  }
  return modules
}

const heavy = [
  /\/src\/features\/gestures\/drag\//,
  /\/src\/features\/layout\//,
  /\/src\/features\/dom-max\./,
  /\/src\/components\/reorder\//,
  /projection\/node\/create-projection-node/,
  /projection\/node\/HTMLProjectionNode/,
]

function bytesFor(modules: Map<string, number>, pattern: RegExp) {
  let total = 0
  for (const [id, size] of modules) if (pattern.test(id)) total += size
  return total
}

describe('tree shaking', () => {
  it('m + LazyMotion + domAnimation pulls in no drag, layout or domMax code', async () => {
    const modules = await bundle(
      `import { m, LazyMotion, domAnimation } from '@/index'\nconsole.log(m, LazyMotion, domAnimation)`,
    )
    // Sanity check: the bundle really contains the pieces that are imported.
    expect(bytesFor(modules, /\/src\/features\/dom-animation\./)).toBeGreaterThan(0)
    expect(bytesFor(modules, /\/src\/components\/lazy-motion\//)).toBeGreaterThan(0)
    for (const pattern of heavy) expect(bytesFor(modules, pattern), String(pattern)).toBe(0)
  }, 60_000)

  it('domMax does bring them in (control for the test above)', async () => {
    const modules = await bundle(`import { domMax } from '@/index'\nconsole.log(domMax)`)
    expect(bytesFor(modules, /\/src\/features\/gestures\/drag\//)).toBeGreaterThan(0)
    expect(bytesFor(modules, /\/src\/features\/layout\//)).toBeGreaterThan(0)
  }, 60_000)
})
