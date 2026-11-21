/* Export parity report: compares the public API of React's `framer-motion`
 * (from its published types) with motion-solid's built types, applying the
 * naming rules in docs/adr/0001-parity-policy.md (use* -> create*).
 *
 *   pnpm --filter motion-solid build && pnpm --filter motion-solid parity
 *
 * Exit code is always 0: the report is informational. The enforced rules
 * (no use* primitives, no collisions with solid-js) live in
 * src/__tests__/exports.test.ts. */
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function exportsOf(file) {
  const program = ts.createProgram([file], {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    noEmit: true,
    types: [],
  })
  const checker = program.getTypeChecker()
  const source = program.getSourceFile(file)
  if (!source) throw new Error(`Cannot read ${file}. Did you run the build?`)
  const moduleSymbol = checker.getSymbolAtLocation(source)
  return checker.getExportsOfModule(moduleSymbol).map((symbol) => {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
    return { name: symbol.name, isType: !(target.flags & ts.SymbolFlags.Value) }
  })
}

/* React name -> Solid name, where it is not the plain use* -> create* swap. */
const RENAMES = {
  useAnimation: 'createAnimationControls',
  useAnimationControls: 'createAnimationControls',
  useComputed: 'createComputedMotionValue',
}
const toSolid = (name) =>
  RENAMES[name] ?? (/^use[A-Z]/.test(name) ? `create${name.slice(3)}` : name)

/* `exports` blocks deep requires, so locate the package through its main entry. */
const reactTypes = path.join(
  path.dirname(require.resolve('framer-motion/package.json', { paths: [root] })),
  'dist/index.d.ts',
)
const react = exportsOf(reactTypes)
const solid = exportsOf(path.join(root, 'dist/es/index.d.ts'))
const solidNames = new Set(solid.map((entry) => entry.name))

const same = []
const renamed = []
const missing = []
for (const entry of react) {
  if (solidNames.has(entry.name)) same.push(entry.name)
  else if (solidNames.has(toSolid(entry.name))) renamed.push(`${entry.name} -> ${toSolid(entry.name)}`)
  else missing.push(`${entry.isType ? '[type] ' : ''}${entry.name}`)
}
const known = new Set([...react.map((entry) => entry.name), ...react.map((entry) => toSolid(entry.name))])
const solidOnly = solid.filter((entry) => !known.has(entry.name)).map((entry) => entry.name)

console.log(`React exports:      ${react.length}`)
console.log(`  same name:        ${same.length}`)
console.log(`  renamed (create): ${renamed.length}`)
console.log(`  not exported:     ${missing.length}`)
console.log(`motion-solid only:  ${solidOnly.length}\n`)
console.log(`RENAMED\n  ${renamed.join('\n  ')}\n`)
console.log(`NOT EXPORTED\n  ${missing.join('\n  ')}\n`)
console.log(`MOTION-SOLID ONLY\n  ${solidOnly.join('\n  ')}`)
