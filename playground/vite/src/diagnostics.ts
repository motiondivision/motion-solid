import { createSignal, OBSERVE } from 'solid-js'

export interface DiagEntry {
  kind: 'page-error' | 'unhandled-rejection' | 'console-error' | 'console-warn' | 'solid'
  /** Counted entries make the badge turn red and fail the smoke run. Solid `info` events are listed only. */
  counted: boolean
  text: string
}

let entries: DiagEntry[] = []
const [snapshot, setSnapshot] = createSignal<readonly DiagEntry[]>([])
let scheduled = false

function publish() {
  if (scheduled) return
  scheduled = true
  // Deferred so a diagnostic emitted inside a reactive computation never writes a signal in that scope.
  queueMicrotask(() => {
    scheduled = false
    setSnapshot(entries.slice())
  })
}

function push(entry: DiagEntry) {
  entries.push(entry)
  publish()
}

/** Reactive list of entries recorded since the last `resetDiagnostics()`. */
export const diagnostics = snapshot

/** Starts a new capture scope (called when a demo is mounted or re-mounted). */
export function resetDiagnostics() {
  entries = []
  publish()
}

const fmt = (value: unknown): string => {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

let installed = false
export function installDiagnostics() {
  if (installed) return
  installed = true

  window.addEventListener('error', e => push({ kind: 'page-error', counted: true, text: e.error ? fmt(e.error) : e.message }))
  window.addEventListener('unhandledrejection', e =>
    push({ kind: 'unhandled-rejection', counted: true, text: fmt(e.reason) }))

  for (const level of ['error', 'warn'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      // Vite's own client logs (HMR) are not demo output.
      if (!(typeof args[0] === 'string' && args[0].startsWith('[vite]')))
        push({ kind: level === 'error' ? 'console-error' : 'console-warn', counted: true, text: args.map(fmt).join(' ') })
      original(...args)
    }
  }

  OBSERVE?.diagnostics.subscribe(event => {
    push({
      kind: 'solid',
      counted: event.severity === 'error' || event.severity === 'warn',
      text: `[${event.code}] (${event.severity}) ${event.message}${event.ownerPath ? ` @ ${event.ownerPath}` : ''}`,
    })
  })
}
