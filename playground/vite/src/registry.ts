import type { Component } from 'solid-js'

export const GROUPS = ['reference', 'cumulative', 'integration', 'stress'] as const
export type Group = (typeof GROUPS)[number]

export interface DemoMeta {
  id: string
  title: string
  group: Group
  description: string
  /** motion-solid exports this demo genuinely exercises (parsed statically by scripts/coverage.mjs). */
  covers: string[]
  level?: number
  /** Substrings of diagnostics this demo triggers on purpose (e.g. the deprecation or reduced-motion hints it demonstrates). They are listed but not counted as failures. */
  expects?: string[]
}

export interface DemoEntry extends DemoMeta {
  component: Component
}

const modules = import.meta.glob<{ meta: DemoMeta; default: Component }>('./demos/*/*.tsx', { eager: true })

export const problems: string[] = []
const seen = new Set<string>()

export const demos: DemoEntry[] = Object.entries(modules)
  .flatMap(([path, mod]) => {
    const [, group, file] = path.match(/\.\/demos\/([^/]+)\/([^/]+)\.tsx$/) ?? []
    const meta = mod.meta
    if (!meta || typeof mod.default !== 'function') {
      problems.push(`${path}: must export \`meta\` and a default component`)
      return []
    }
    if (meta.id !== file) problems.push(`${path}: meta.id "${meta.id}" must equal the file name "${file}"`)
    if (meta.group !== group) problems.push(`${path}: meta.group "${meta.group}" must equal the folder "${group}"`)
    if (!GROUPS.includes(meta.group)) problems.push(`${path}: unknown group "${meta.group}"`)
    const key = `${meta.group}/${meta.id}`
    if (seen.has(key)) problems.push(`${path}: duplicate demo ${key}`)
    seen.add(key)
    return [{ ...meta, component: mod.default }]
  })
  .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.id.localeCompare(b.id))

export const byGroup = (group: Group) => demos.filter(d => d.group === group)
export const find = (group: string, id: string) => demos.find(d => d.group === group && d.id === id)
