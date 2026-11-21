import type { Accessor } from 'solid-js'
import type { MotionConfigState } from './types'
import { createContext } from '@/utils/createContext'

/**
 * Default motion configuration
 */
export const defaultConfig: MotionConfigState = {
  reducedMotion: 'never',
  transition: undefined,
  nonce: undefined,
}

/**
 * Context for sharing motion configuration with descendants. The value is an
 * accessor so `MotionConfig` props can change over time.
 */
const [useMotionConfigCtx, MotionConfigContext] = createContext<Accessor<MotionConfigState>>('MotionConfig', () => defaultConfig)

export { MotionConfigContext }

/** The nearest `MotionConfig` as an accessor; `defaultConfig` when there is none. */
export function useMotionConfig(): Accessor<MotionConfigState> {
  return useMotionConfigCtx()
}
