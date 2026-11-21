import { transform } from 'motion-dom'
import type { AnyResolvedKeyframe, MotionValue, TransformOptions } from 'motion-dom'
import { access } from '@solid-primitives/utils'
import type { MaybeAccessor } from '@solid-primitives/utils'
import { createMemo, createRenderEffect } from 'solid-js'
import { createCombineMotionValues } from './use-combine-values'
import { createComputedMotionValue } from './use-computed'

export type InputRange = number[]
type SingleTransformer<I, O> = (input: I) => O
type MultiTransformer<I, O> = (input: I[]) => O
type Transformer<I, O> =
  | SingleTransformer<I, O>
  | MultiTransformer<AnyResolvedKeyframe, O>

/**
 * A map of output ranges (each an array or an accessor of one), keyed by the name of
 * the MotionValue to create for it.
 */
export type OutputMap<O = any> = { [key: string]: MaybeAccessor<O[]> }

/**
 * Creates a MotionValue that transforms the output of another MotionValue by mapping it from one
 * range of values into another.
 *
 * Given an input range of `[-200, -100, 100, 200]` and an output range of `[0, 1, 1, 0]`, the
 * returned MotionValue will:
 *
 * - When provided a value between `-200` and `-100`, return a value between `0` and `1`.
 * - When provided a value between `-100` and `100`, return `1`.
 * - When provided a value between `100` and `200`, return a value between `1` and `0`.
 *
 * The input range must be a linear series of numbers. The output range can be any value type
 * Motion supports: numbers, colors, shadows, etc. Every value in the output range must be of the
 * same type and format.
 *
 * `inputRange`, `outputRange` and `options` may be accessors; the MotionValue updates when they
 * change.
 *
 * ```tsx
 * const x = createMotionValue(0)
 * const opacity = createTransform(x, [-200, -100, 100, 200], [0, 1, 1, 0])
 * <motion.div style={{ opacity, x }} />
 * ```
 *
 * @param value - The `MotionValue` to read.
 * @param inputRange - A linear series of numbers (either all increasing or decreasing).
 * @param outputRange - A series of numbers, colors or strings. Must be the same length as `inputRange`.
 * @param options - `clamp` (default `true`) and `ease` (an easing or an array one item shorter than the ranges).
 */
export function createTransform<I, O>(
  value: MotionValue<number>,
  inputRange: MaybeAccessor<InputRange>,
  outputRange: MaybeAccessor<O[]>,
  options?: MaybeAccessor<TransformOptions<O> | undefined>
): MotionValue<O>

/**
 * Creates a MotionValue from a function of other values. The function re-runs when any MotionValue
 * or Solid signal it reads changes.
 *
 * ```ts
 * const doubled = createTransform(() => x.get() * 2)
 * ```
 */
export function createTransform<I, O>(transformer: () => O): MotionValue<O>

/**
 * Creates a MotionValue that passes the latest value of `input` through a function.
 *
 * The function is called from Motion's frame loop; to depend on Solid signals use the
 * `createTransform(() => ...)` form.
 *
 * ```ts
 * const y = createTransform(x, value => value * 2)
 * ```
 */
export function createTransform<I, O>(
  input: MotionValue<I>,
  transformer: SingleTransformer<I, O>
): MotionValue<O>

/**
 * Passes an array of MotionValues and a function to combine them.
 *
 * ```ts
 * const z = createTransform([x, y], ([latestX, latestY]) => latestX * latestY)
 * ```
 */
export function createTransform<I, O>(
  input:
    | MotionValue<string>[]
    | MotionValue<number>[]
    | MotionValue<AnyResolvedKeyframe>[],
  transformer: MultiTransformer<I, O>
): MotionValue<O>

/**
 * Creates several MotionValues from a single input, one per key of the output map.
 *
 * ```ts
 * const { opacity, scale } = createTransform(x, [0, 100], { opacity: [0, 1], scale: [0.5, 1] })
 * ```
 *
 * The keys of the map are read once; the ranges themselves may be accessors.
 */
export function createTransform<O extends Record<string, any[]>>(
  value: MotionValue<number>,
  inputRange: MaybeAccessor<InputRange>,
  outputMap: { [K in keyof O]: MaybeAccessor<O[K]> },
  options?: MaybeAccessor<TransformOptions<O[keyof O][number]> | undefined>
): { [K in keyof O]: MotionValue<O[K][number]> }

export function createTransform<I, O>(
  input:
    | MotionValue<I>
    | MotionValue<string>[]
    | MotionValue<number>[]
    | MotionValue<AnyResolvedKeyframe>[]
    | (() => O),
  inputRangeOrTransformer?: MaybeAccessor<InputRange> | Transformer<I, O>,
  outputRangeOrMap?: MaybeAccessor<O[]> | OutputMap<O>,
  options?: MaybeAccessor<TransformOptions<O> | undefined>,
): MotionValue<O> | { [key: string]: MotionValue<O> } {
  if (typeof input === 'function')
    return createComputedMotionValue(input)

  /**
   * An output map is a plain object of output ranges. It selects the multi-output form.
   */
  if (
    outputRangeOrMap !== undefined
    && !Array.isArray(outputRangeOrMap)
    && typeof outputRangeOrMap !== 'function'
  ) {
    const outputMap = outputRangeOrMap as OutputMap<O>
    const output: { [key: string]: MotionValue<O> } = {}
    for (const key of Object.keys(outputMap)) {
      output[key] = createTransform(
        input as MotionValue<number>,
        inputRangeOrTransformer as MaybeAccessor<InputRange>,
        outputMap[key],
        options,
      ) as MotionValue<O>
    }
    return output
  }

  /**
   * A second argument that is a function is the transformer, unless an output range follows it,
   * in which case it is an accessor of the input range.
   */
  const isRangeTransform = outputRangeOrMap !== undefined

  const getTransformer: () => Transformer<I, O> = isRangeTransform
    ? createMemo(() => transform(
      access(inputRangeOrTransformer as MaybeAccessor<InputRange>),
      access(outputRangeOrMap as MaybeAccessor<O[]>),
      access(options),
    ) as Transformer<I, O>)
    : () => inputRangeOrTransformer as Transformer<I, O>

  const result = Array.isArray(input)
    ? createListTransform(
      input,
      latest => (getTransformer() as MultiTransformer<AnyResolvedKeyframe, O>)(latest),
    )
    : createListTransform(
      [input],
      ([latest]) => (getTransformer() as SingleTransformer<I, O>)(latest),
    )

  if (isRangeTransform && !Array.isArray(input)) {
    propagateAccelerate(
      input as MotionValue<I>,
      result,
      inputRangeOrTransformer as MaybeAccessor<InputRange>,
      outputRangeOrMap as MaybeAccessor<O[]>,
      options,
    )
  }

  return result
}

/**
 * Propagates the `accelerate` config for native scroll timeline support. When the input is a
 * scroll progress MotionValue with an accelerate config (set by createScroll), it is forwarded
 * to the output with updated times/keyframes so the motion component can drive this transform
 * with a native scroll timeline. Re-evaluated when the ranges or options change.
 */
function propagateAccelerate<I, O>(
  input: MotionValue<I>,
  result: MotionValue<O>,
  inputRange: MaybeAccessor<InputRange>,
  outputRange: MaybeAccessor<O[]>,
  options: MaybeAccessor<TransformOptions<O> | undefined>,
) {
  let propagated = false

  createRenderEffect(
    () => ({
      inputRange: access(inputRange),
      outputRange: access(outputRange),
      options: access(options),
    }),
    ({ inputRange, outputRange, options }) => {
      const inputAccelerate = input.accelerate

      if (
        inputAccelerate
        && !inputAccelerate.isTransformed
        && options?.clamp !== false
        // WAAPI can't call a mixer
        && !options?.mixer
      ) {
        const ease = options?.ease

        /**
         * WAAPI fills missing 0 and 1 offsets with the underlying value, so
         * hold the end values to match the clamped transform.
         */
        result.accelerate = {
          ...inputAccelerate,
          times: [0, ...inputRange, 1],
          keyframes: [
            outputRange[0],
            ...outputRange,
            outputRange[outputRange.length - 1],
          ],
          isTransformed: true,
          ...(ease
            ? { ease: Array.isArray(ease) ? [ease[0], ...ease] : ease }
            : {}),
        }
        propagated = true
      }
      else if (propagated) {
        result.accelerate = undefined
        propagated = false
      }
    },
  )
}

function createListTransform<I, O>(
  values: MotionValue<I>[],
  transformer: MultiTransformer<I, O>,
): MotionValue<O> {
  const latest: I[] = []

  return createCombineMotionValues(() => {
    latest.length = 0
    const numValues = values.length
    for (let i = 0; i < numValues; i++)
      latest[i] = values[i].get()
    return transformer(latest)
  }, values)
}
