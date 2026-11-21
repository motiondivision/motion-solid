import type { Context } from 'solid-js'
import { createContext as createSolidContext, useContext } from 'solid-js'

/**
 * Reads a context created with {@link createContext}.
 *
 * - no argument: returns the context value, else the context default, else throws.
 * - `null`: returns `null` when there is no provider (and no default is skipped).
 * - a value: returns that value when there is no provider.
 */
export interface UseContext<T> {
  (): T
  (fallback: null): T | null
  (fallback: T): T
}

/**
 * Thin typed wrapper over Solid 2's `createContext`. Kept for path parity with
 * motion-vue's `utils/createContext.ts`.
 *
 * The underlying Solid context holds `T | null` with a `null` default, so reading it
 * never throws inside Solid; the wrapper throws a named error instead when there is
 * no provider, no fallback and no default.
 *
 * @param name - Name of the provider component, used in the error message and as the devtools label.
 * @param defaultValue - Value returned when no provider is mounted and no fallback is passed.
 * @returns `[useCtx, Ctx]`; provide with `<Ctx value={v}>`.
 */
export function createContext<T>(name: string | string[], defaultValue?: T): readonly [useCtx: UseContext<T>, Ctx: Context<T | null>] {
  const label = Array.isArray(name) ? name.join('|') : name
  const Ctx = createSolidContext<T | null>(null, { name: `${label}Context` } as any)

  const useCtx = ((fallback?: T | null) => {
    const value = useContext(Ctx)
    if (value != null)
      return value
    if (fallback !== undefined)
      return fallback
    if (defaultValue !== undefined)
      return defaultValue
    throw new Error(
      `${label}Context not found. Component must be used within ${
        Array.isArray(name) ? `one of the following components: ${name.join(', ')}` : `\`${label}\``
      }`,
    )
  }) as UseContext<T>

  return [useCtx, Ctx] as const
}
