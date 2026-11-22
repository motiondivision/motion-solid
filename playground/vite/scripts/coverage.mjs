// Export coverage: every runtime export of motion-solid must be named by some demo's
// `meta.covers` literal array, or sit in coverage.allowlist.json with a specific reason.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRY = process.env.MOTION_SOLID_DIST ?? join(root, '../../packages/motion/dist/es/index.mjs')
const GROUPS = ['reference', 'cumulative', 'integration', 'stress']

const mod = await import(pathToFileURL(ENTRY).href)
const exportsList = Object.keys(mod).filter(k => k !== 'default').sort()
const real = new Set(exportsList)

// ---- demos: statically parse `covers: [...]` of the exported meta (no execution).
const covered = new Map() // export -> demos[]
const problems = []
const demosDir = join(root, 'src/demos')
for (const group of readdirSync(demosDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
  if (!GROUPS.includes(group.name)) problems.push(`unknown demo group folder "${group.name}"`)
  for (const file of readdirSync(join(demosDir, group.name)).filter(f => f.endsWith('.tsx'))) {
    const rel = `${group.name}/${file}`
    const src = readFileSync(join(demosDir, group.name, file), 'utf8')
    const metaBlock = src.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\n\}/)
    const arr = (metaBlock?.[1] ?? '').match(/covers\s*:\s*\[([^\]]*)\]/)
    if (!arr) {
      problems.push(`${rel}: no literal \`covers: [...]\` array found in exported meta`)
      continue
    }
    const items = [...arr[1].matchAll(/(['"`])([^'"`]*)\1/g)].map(m => m[2])
    const stripped = arr[1].replace(/(['"`])[^'"`]*\1/g, '').replace(/[,\s]/g, '')
    if (stripped) problems.push(`${rel}: covers must contain only string literals (found "${stripped}")`)
    // The code a demo actually runs: everything except the meta block and import statements.
    const code = src
      .replace(/export\s+const\s+meta\s*=\s*\{[\s\S]*?\n\}[^\n]*/, '')
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*;?$/gm, '')
    for (const name of items) {
      if (!real.has(name)) problems.push(`${rel}: covers "${name}" is not a runtime export of motion-solid`)
      // Listing an export is not using it: it must also appear in the demo's code.
      else if (!new RegExp(`(^|[^\\w$])${name.replace(/\$/g, '\\$')}($|[^\\w$])`).test(code))
        problems.push(`${rel}: covers "${name}" but the demo never uses it outside meta and the import`)
      if (!covered.has(name)) covered.set(name, [])
      covered.get(name).push(rel)
    }
  }
}

// ---- allowlist
const allowRaw = JSON.parse(readFileSync(join(root, 'coverage.allowlist.json'), 'utf8'))
const allowed = new Map() // export -> reason
for (const [key, value] of Object.entries(allowRaw)) {
  if (key.startsWith('_')) continue
  if (typeof value === 'string') {
    if (value.trim().length < 20) problems.push(`allowlist "${key}": reason too short to be specific`)
    allowed.set(key, value)
  } else if (value && Array.isArray(value.group) && typeof value.reason === 'string') {
    if (value.reason.trim().length < 20) problems.push(`allowlist group "${key}": reason too short to be specific`)
    for (const name of value.group) allowed.set(name, value.reason)
  } else problems.push(`allowlist "${key}": must be "<reason>" or { group: [...], reason }`)
}
// Array form: [{ group: [...], reason }]
if (Array.isArray(allowRaw)) {
  for (const entry of allowRaw) for (const name of entry.group ?? []) allowed.set(name, entry.reason)
}

const uncovered = []
const allowedAndCovered = []
const staleAllow = []
for (const name of exportsList) {
  const isCovered = covered.has(name)
  const isAllowed = allowed.has(name)
  if (isCovered && isAllowed) allowedAndCovered.push(name)
  if (!isCovered && !isAllowed) uncovered.push(name)
}
for (const name of allowed.keys()) if (!real.has(name)) staleAllow.push(name)

const coveredCount = exportsList.filter(n => covered.has(n)).length
const allowedCount = exportsList.filter(n => allowed.has(n) && !covered.has(n)).length

const list = (title, names) => names.length && console.log(`\n${title} (${names.length}):\n  ${names.join('\n  ')}`)
list('UNCOVERED exports (add a demo or an allowlist entry with a specific reason)', uncovered)
list('ALLOWLISTED but also covered by a demo (remove the allowlist entry)', allowedAndCovered)
list('ALLOWLIST entries that are not exports anymore', staleAllow)
list('PROBLEMS', problems)

console.log('\n+----------------------+-------+')
console.log(`| covered              | ${String(coveredCount).padStart(5)} |`)
console.log(`| allowlisted          | ${String(allowedCount).padStart(5)} |`)
console.log(`| uncovered            | ${String(uncovered.length).padStart(5)} |`)
console.log(`| total runtime exports| ${String(exportsList.length).padStart(5)} |`)
console.log('+----------------------+-------+')
console.log(`covered ${coveredCount} / allowlisted ${allowedCount} / total ${exportsList.length}`)

process.exit(uncovered.length || allowedAndCovered.length || staleAllow.length || problems.length ? 1 : 0)
