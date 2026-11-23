<h1 align="center"> <img width="35" height="35" alt="Motion logo" src="https://github.com/user-attachments/assets/00d6d1c3-72c4-4c2f-a664-69da13182ffc" /><br />Motion for Solid 2.0</h1>

<!-- npm badges are hidden until the package is published: the `motion-solid` name on npm belongs to a different
     library (see issue #5), so the shields would show that package's numbers. Restore them with the final name:
<p align="center">
  <a href="https://www.npmjs.com/package/<final-name>" target="_blank">
    <img src="https://img.shields.io/npm/v/<final-name>.svg?style=flat-square" />
  </a>
  <a href="https://www.npmjs.com/package/<final-name>" target="_blank">
  <img src="https://img.shields.io/npm/dm/<final-name>.svg?style=flat-square" />
  </a>
</p>
-->

<br>
<hr>
<br>

Motion for Solid is an open source animation library for Solid 2.0. It brings the Motion engine (springs, keyframes, gestures, layout and scroll animations) to Solid components, with reactive props and `create*` primitives that clean up with their owner.

It's the only animation library with a hybrid engine, combining the power of JavaScript animations with the performance of native browser APIs.

It looks like this:

```jsx
<motion.div animate={{ x: 100 }} />
```

It does all this:

- Springs
- Keyframes
- Layout animations
- Shared layout animations
- Gestures (drag/tap/hover/focus)
- Scroll animations
- SVG paths
- Exit animations
- Server-side rendering
- Independent transforms
- Orchestrate animations across components
- CSS variables
- Reorderable lists
- Lazy-loaded feature bundles

...and a whole lot more.

## Get started

### 🐇 Quick start

> **Not published yet.** The name `motion-solid` on npm belongs to a different library (a Solid 1.x package), so
> `npm install motion-solid` installs that one, not this. Until this package is published under its final name, use it
> from a clone of this repository: run `pnpm install` and `pnpm build`, then `pnpm play` to try it in the playground.
> The examples below import from `motion-solid`; that specifier changes if the published name does.

`motion-solid` needs `solid-js >=2` and `@solidjs/web >=2` as peer dependencies. Solid 1.x is not supported.

Then import the `motion` component:

```tsx
import { motion } from 'motion-solid'

export function Box() {
  return <motion.div animate={{ x: 100 }} />
}
```

Props are read reactively, so `animate` re-runs when a signal it reads changes:

```tsx
import { createSignal } from 'solid-js'
import { motion } from 'motion-solid'

export function Toggle() {
  const [open, setOpen] = createSignal(false)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: open() ? 200 : 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
      onClick={() => setOpen(value => !value)}
    />
  )
}
```

### Usage

#### Variants

Variants propagate from a motion component to its motion children, so one `animate` label can orchestrate a whole tree.

```tsx
import { For } from 'solid-js'
import { motion } from 'motion-solid'

const list = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function Menu() {
  return (
    <motion.ul variants={list} initial="hidden" animate="visible">
      <For each={['One', 'Two', 'Three']}>
        {label => <motion.li variants={item}>{label}</motion.li>}
      </For>
    </motion.ul>
  )
}
```

#### Gestures

```tsx
import { motion } from 'motion-solid'

export function Button() {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => console.log('hover start')}
    >
      Click me
    </motion.button>
  )
}

export function Draggable() {
  return <motion.div drag="x" dragConstraints={{ left: -100, right: 100 }} />
}
```

#### AnimatePresence

Wrap children that come and go. A `Show` branch or a keyed `For` item runs its `exit` animation before it leaves the DOM.

```tsx
import { createSignal, Show } from 'solid-js'
import { AnimatePresence, motion } from 'motion-solid'

export function Modal() {
  const [visible, setVisible] = createSignal(true)
  return (
    <>
      <button onClick={() => setVisible(value => !value)}>Toggle</button>
      <AnimatePresence>
        <Show when={visible()}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </Show>
      </AnimatePresence>
    </>
  )
}
```

`AnimatePresence` takes `mode` (`"sync"`, `"popLayout"` or `"wait"`), `initial`, `custom`, `onExitComplete`, `propagate` and `as` (render a wrapper element). Components that are not motion elements opt in with `createPresence`:

```tsx
import { createPresence } from 'motion-solid'

export function Toast() {
  let el!: HTMLDivElement
  const [isPresent, safeToRemove] = createPresence({ element: () => el })
  // isPresent() turns false when the exit starts; call safeToRemove() when your exit is done.
  return <div ref={el} onTransitionEnd={() => !isPresent() && safeToRemove()} />
}
```

#### Reorder

```tsx
import { createSignal, For } from 'solid-js'
import { Reorder } from 'motion-solid'

export function List() {
  const [items, setItems] = createSignal(['a', 'b', 'c'])
  return (
    <Reorder.Group values={items()} onReorder={setItems}>
      <For each={items()}>
        {item => <Reorder.Item value={item}>{item}</Reorder.Item>}
      </For>
    </Reorder.Group>
  )
}
```

`Reorder.Group` renders a `ul` and `Reorder.Item` an `li` (change them with `as`). Items can also be reordered with the keyboard: Space grabs, arrows move, Escape cancels.

#### Layout animations

```tsx
import { createSignal, For, Show } from 'solid-js'
import { LayoutGroup, motion } from 'motion-solid'

export function Tabs() {
  const [selected, setSelected] = createSignal(0)
  return (
    <LayoutGroup>
      <For each={[0, 1, 2]}>
        {tab => (
          <motion.button layout onClick={() => setSelected(tab)}>
            Tab {tab}
            <Show when={selected() === tab}>
              <motion.div layoutId="underline" />
            </Show>
          </motion.button>
        )}
      </For>
    </LayoutGroup>
  )
}
```

#### Motion values and scroll-linked animation

Primitives are named `create*`. Reactive inputs are accessors (`() => value`), and primitives return `MotionValue`s that you pass straight to `style`.

```tsx
import { createMotionValue, createScroll, createSpring, createTransform, motion } from 'motion-solid'

export function ProgressBar() {
  const { scrollYProgress } = createScroll()
  const scaleX = createSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  return <motion.div style={{ scaleX, originX: 0 }} />
}

export function Fade() {
  const x = createMotionValue(0)
  const opacity = createTransform(x, [-200, 0, 200], [0, 1, 0])
  return <motion.div drag="x" style={{ x, opacity }} />
}
```

`createScroll` returns `scrollX`, `scrollY`, `scrollXProgress`, `scrollYProgress`, `scrollXLength` and `scrollYLength`. To track an element, pass options as an accessor:

```tsx
import { createScroll, createTransform, motion } from 'motion-solid'

export function Section() {
  let target!: HTMLDivElement
  const { scrollYProgress } = createScroll(() => ({
    target: () => target,
    offset: ['start end', 'end end'],
  }))
  const y = createTransform(scrollYProgress, [0, 1], [100, 0])
  return (
    <div ref={target}>
      <motion.div style={{ y }} />
    </div>
  )
}
```

The other primitives are `createVelocity`, `createMotionTemplate`, `createMotionValueEvent`, `createTime`, `createAnimationFrame`, `createReducedMotion`, `createDragControls`, `createAnimationControls`, `createPresenceData` and `createCycle`. Pure helpers keep their plain names: `animate`, `scroll`, `inView`, `stagger`, `spring`, `cubicBezier`.

#### Refs and elements

`ref` on a motion component is a normal Solid ref (a callback, a variable, or an array of them). `createDomRef` gives you the element as an accessor, for primitives that need one:

```tsx
import { createDomRef, createInView, motion } from 'motion-solid'

export function Reveal() {
  const [el, ref] = createDomRef<HTMLDivElement>()
  const visible = createInView(el, { once: true })
  return <motion.div ref={ref} animate={{ opacity: visible() ? 1 : 0 }} />
}
```

#### Imperative animation

```tsx
import { onSettled } from 'solid-js'
import { createAnimate } from 'motion-solid'

export function Items() {
  const [scope, animate] = createAnimate()
  onSettled(() => {
    animate('li', { opacity: 1 })
  })
  return (
    <ul ref={scope}>
      <li style={{ opacity: 0 }} />
    </ul>
  )
}
```

Animations stop when the owner is disposed.

#### MotionConfig

`MotionConfig` sets defaults for every motion component below it: `transition`, `reducedMotion`, `skipAnimations`, `nonce` and `inViewOptions`.

```tsx
import { MotionConfig, motion } from 'motion-solid'

export function App() {
  return (
    <MotionConfig transition={{ duration: 0.4 }} reducedMotion="user">
      <motion.div animate={{ opacity: 1 }} />
    </MotionConfig>
  )
}
```

#### Smaller bundles with LazyMotion

`LazyMotion` loads a feature bundle (`domAnimation` or `domMax`) once, and the `m` component reads it. `features` can be an object or a function returning a promise, such as `() => import('./features')`. With `strict`, rendering a full `motion` component below it throws.

```tsx
import { LazyMotion, domAnimation, m } from 'motion-solid'

export function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  )
}
```

#### Attach motion to any element

Solid 2 has no `use:` directives, so motion is attached to elements that are not motion components through a ref factory: call `attachMotion` in a component body and pass the result as `ref`. Give it an accessor when the options change over time. It does not inherit variants from a parent and does not run on the server (use `getMotionSSRStyle(options, tag)` for the initial style; it returns dash-case keys, and for SVG tags only the style, not the attributes motion moves out of it).

```tsx
import { createSignal } from 'solid-js'
import { attachMotion, createPresetMotion } from 'motion-solid'

const fadeIn = createPresetMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })

export function Attached() {
  const [x, setX] = createSignal(0)
  return (
    <>
      <div ref={attachMotion({ initial: { opacity: 0 }, animate: { opacity: 1 } })} />
      <div ref={attachMotion(() => ({ animate: { x: x() } }))} onClick={() => setX(100)} />
      <div ref={fadeIn({ transition: { duration: 1 } })} />
    </>
  )
}
```

For an element you create or receive yourself, such as a third-party widget, `makeMotion` attaches motion to it immediately and returns a function that removes it. It follows the `make*` convention of Solid Primitives (compare `makeEventListener`): the options are a plain object, and it is removed automatically when the owner it was called in is disposed.

```tsx
import { makeMotion } from 'motion-solid'

export function Widget() {
  const el = document.createElement('div')
  el.textContent = 'Hello'
  // Removed when Widget is disposed. Outside a component, keep the returned function and call it to stop.
  makeMotion(el, { initial: { opacity: 0 }, animate: { opacity: 1 }, whileHover: { scale: 1.1 } })
  return el
}
```

Call `makeMotion` from a component body, a computation, or an event handler, not from `onSettled` or an effect's apply callback: Solid 2 does not allow registering cleanup there. To change the options of an attached element, use `attachMotion` with an accessor.

#### Notes

- Do not destructure props in your own components.
- Motion writes `style` and SVG attributes from its frame loop. Solid sets your `style` prop once and only re-applies it when the prop changes, so do not drive the same property from both `style` and `animate`.
- Your bundler needs `jsx: preserve` with `jsxImportSource: "@solidjs/web"` (the Solid 2 Vite plugin does this for you).

## ⚡️ Motion+

Learn, Design, Build. [Motion+](https://motion.dev/plus) is a one-time fee, lifetime update membership that provides:
- 160+ premium Motion Examples
- Motion UI features like Cursor and Ticker
- Motion Studio animation editing for VS Code `alpha`
- Early access content
- Private Discord

[Get Motion+](https://motion.dev/plus)

## 🎨 Studio

Motion Studio is a versatile suite of developer tools allowing you to:

-   Visually edit CSS and Motion easing curves in VS Code
-   Generate CSS springs with LLMs
-   Load Motion docs into your LLM

Get started with [Motion Studio](https://motion.dev/docs/tools-quick-start).

### 💎 Contribute

- Want to contribute? Clone the repo, then run `pnpm install`, `pnpm build` and `pnpm test`. The playground (`pnpm play`) has a demo for each feature.
- Read [docs/agents/architecture.md](https://github.com/motiondivision/motion-solid/blob/main/docs/agents/architecture.md) and [docs/agents/porting-contract.md](https://github.com/motiondivision/motion-solid/blob/main/docs/agents/porting-contract.md) before changing code.
- [Join the Motion discord](https://discord.com/invite/dCBuRgdNDG)

### 👩🏻‍⚖️ License

- Motion for Solid is MIT licensed.
- It builds on [motion-vue](https://github.com/motiondivision/motion-vue) and [Framer Motion / Motion](https://github.com/motiondivision/motion), both MIT licensed. See [NOTICE](https://github.com/motiondivision/motion-solid/blob/main/NOTICE).
