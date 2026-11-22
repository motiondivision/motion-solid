import { createMemo, createSignal, For, onSettled, Show } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import { MotionConfig } from 'motion-solid'
import { byGroup, demos, find, GROUPS, problems } from './registry'
import { diagnostics, resetDiagnostics } from './diagnostics'

type ReducedMotion = 'default' | 'user' | 'always' | 'never'

const parseHash = () => {
  const [group, id] = location.hash.replace(/^#\/?/, '').split('/')
  return { group: group ?? '', id: id ?? '' }
}

export function App() {
  const [route, setRoute] = createSignal(parseHash())
  const [nonce, setNonce] = createSignal(0)
  const [query, setQuery] = createSignal('')
  const [reduced, setReduced] = createSignal<ReducedMotion>('default')
  const [skip, setSkip] = createSignal(false)

  onSettled(() => {
    if (!location.hash && demos.length) location.replace(`#/${demos[0].group}/${demos[0].id}`)
    const onHash = () => {
      resetDiagnostics()
      setRoute(parseHash())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  const current = createMemo(() => {
    const { group, id } = route()
    return find(group, id) ?? (location.hash ? undefined : demos[0])
  })
  const mountKey = () => {
    const demo = current()
    return demo ? `${demo.group}/${demo.id}#${nonce()}` : undefined
  }

  const matches = (text: string) => text.toLowerCase().includes(query().trim().toLowerCase())
  const visible = (group: (typeof GROUPS)[number]) =>
    byGroup(group).filter(d => matches([d.id, d.title, d.description, ...d.covers].join(' ')))

  const isExpected = (d: { text: string }) => (current()?.expects ?? []).some(pattern => d.text.includes(pattern))
  const counted = () => diagnostics().filter(d => d.counted && !isExpected(d)).length

  return (
    <div class="app">
      <aside class="sidebar">
        <header>
          <h1>motion-solid</h1>
          <span
            class="badge"
            data-testid="diag-count"
            data-bad={counted() > 0 ? 'true' : 'false'}
            title="Errors and warnings captured while this demo is mounted"
          >
            {counted()}
          </span>
        </header>
        <input
          type="search"
          placeholder="Search demos or exports"
          aria-label="Search demos"
          value={query()}
          onInput={e => setQuery(e.currentTarget.value)}
        />
        <nav>
          <For each={GROUPS}>
            {group => (
              <Show when={visible(group).length > 0}>
                <h2>{group}</h2>
                <For each={visible(group)}>
                  {demo => (
                    <a
                      href={`#/${demo.group}/${demo.id}`}
                      aria-current={mountKey()?.startsWith(`${demo.group}/${demo.id}#`) ? 'page' : undefined}
                    >
                      {demo.title}
                    </a>
                  )}
                </For>
              </Show>
            )}
          </For>
        </nav>
        <Show when={problems.length > 0}>
          <ul class="problems" data-testid="registry-problems">
            <For each={problems}>{p => <li>{p}</li>}</For>
          </ul>
        </Show>
      </aside>

      <main>
        <Show when={current()} fallback={<p class="empty">No demo at <code>{location.hash}</code>.</p>}>
          {demo => (
            <>
              <div class="toolbar">
                <div class="toolbar-title">
                  <h2>{demo().title}</h2>
                  <p>{demo().description}</p>
                  <p class="covers">
                    <For each={demo().covers}>{c => <code>{c}</code>}</For>
                  </p>
                </div>
                <div class="toolbar-actions">
                  <label>
                    reduced motion
                    <select
                      aria-label="Reduced motion"
                      value={reduced()}
                      onChange={e => setReduced(e.currentTarget.value as ReducedMotion)}
                    >
                      <option value="default">default</option>
                      <option value="user">user</option>
                      <option value="always">always</option>
                      <option value="never">never</option>
                    </select>
                  </label>
                  <label>
                    <input type="checkbox" checked={skip()} onChange={e => setSkip(e.currentTarget.checked)} />
                    skip animations
                  </label>
                  <button
                    type="button"
                    class="btn"
                    onClick={() => {
                      resetDiagnostics()
                      setNonce(n => n + 1)
                    }}
                  >
                    Remount
                  </button>
                </div>
              </div>
              <For each={mountKey() ? [mountKey() as string] : []}>
                {() => (
                  <section class="demo" data-demo-root data-demo={`${demo().group}/${demo().id}`}>
                    <MotionConfig reducedMotion={reduced() === 'default' ? undefined : reduced() as 'user' | 'always' | 'never'} skipAnimations={skip() || undefined}>
                      <Dynamic component={demo().component} />
                    </MotionConfig>
                  </section>
                )}
              </For>
            </>
          )}
        </Show>

        <details class="diag" data-testid="diag-panel" open={counted() > 0}>
          <summary>
            Diagnostics <span data-testid="diag-total">{diagnostics().length}</span> entries, {counted()} errors/warnings
          </summary>
          <Show when={diagnostics().length === 0}>
            <p class="empty">Nothing captured.</p>
          </Show>
          <ol>
            <For each={diagnostics()}>
              {(entry, i) => (
                <li data-kind={entry.kind} data-counted={entry.counted && !isExpected(entry) ? 'true' : 'false'}>
                  <b>{entry.kind}</b> <pre>{entry.text}</pre>
                </li>
              )}
            </For>
          </ol>
        </details>
      </main>
    </div>
  )
}
