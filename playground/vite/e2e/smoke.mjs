// Smoke test: start the dev server, open every demo, click every button inside the demo root once,
// and fail on any console error/warn, page error, unhandled rejection or Solid diagnostic.
import { readdirSync, readFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const only = process.argv.slice(2) // optional filters: group/id

// Same discovery as src/registry.ts (glob ./demos/*/*.tsx), parsed node-side.
const demos = []
const demosDir = join(root, 'src/demos')
for (const g of readdirSync(demosDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
  for (const f of readdirSync(join(demosDir, g.name)).filter(f => f.endsWith('.tsx'))) {
    const src = readFileSync(join(demosDir, g.name, f), 'utf8')
    const id = src.match(/export\s+const\s+meta[\s\S]*?\bid\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? f.replace(/\.tsx$/, '')
    demos.push(`${g.name}/${id}`)
  }
}
const targets = demos.filter(d => !only.length || only.some(o => d.includes(o))).sort()

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createNetServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })

const port = await freePort()
const server = await createServer({ root, logLevel: 'warn', server: { port, strictPort: true, host: '127.0.0.1' } })
await server.listen()
const browser = await chromium.launch()
const rows = []
try {
  for (const demo of targets) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const outside = [] // anything that happens before the diagnostics panel can see it
    page.on('pageerror', e => outside.push(`pageerror: ${e.message}`))
    await page.goto(`http://127.0.0.1:${port}/#/${demo}`)
    let clicked = 0, skipped = 0, note = ''
    try {
      await page.waitForSelector(`[data-demo="${demo}"]`, { timeout: 15000 })
      await page.waitForTimeout(500)
      const buttons = await page.locator('[data-demo-root] button').elementHandles()
      for (const handle of buttons) {
        try {
          await handle.click({ timeout: 1500 })
          clicked++
        } catch {
          skipped++ // detached, disabled or covered after an earlier click
        }
        await page.waitForTimeout(120)
      }
      await page.waitForTimeout(800)
      const counted = Number(await page.locator('[data-testid=diag-count]').textContent())
      const problems = await page.locator('[data-testid=registry-problems] li').allTextContents()
      const entries = await page.locator('[data-testid=diag-panel] li[data-counted=true]').allTextContents()
      if (counted > 0) note = entries.map(e => e.replace(/\s+/g, ' ').slice(0, 160)).join(' | ')
      if (problems.length) note += ` registry: ${problems.join('; ')}`
      if (outside.length) note += ` ${outside.join('; ')}`
      rows.push({ demo, buttons: buttons.length, clicked, skipped, diagnostics: counted, ok: !note })
    } catch (e) {
      rows.push({ demo, buttons: 0, clicked, skipped, diagnostics: '?', ok: false })
      note = `failed to load: ${e.message.split('\n')[0]}`
    }
    rows[rows.length - 1].note = note
    await page.close()
  }
} finally {
  await browser.close()
  await server.close()
}

const pad = (v, n) => String(v).padEnd(n)
console.log(`${pad('demo', 32)}${pad('buttons', 9)}${pad('clicked', 9)}${pad('skipped', 9)}${pad('diag', 6)}result`)
for (const r of rows)
  console.log(`${pad(r.demo, 32)}${pad(r.buttons, 9)}${pad(r.clicked, 9)}${pad(r.skipped, 9)}${pad(r.diagnostics, 6)}${r.ok ? 'ok' : 'FAIL ' + r.note}`)
const failed = rows.filter(r => !r.ok)
console.log(`\n${rows.length - failed.length}/${rows.length} demos clean`)
process.exit(failed.length || !rows.length ? 1 : 0)
