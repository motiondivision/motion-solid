import type { JSX } from '@solidjs/web'

/** Fixed-height box a demo draws in. `height` is a CSS length string (default '240px'). */
export function Stage(props: { children?: JSX.Element; height?: string; class?: string }) {
  return (
    <div class={'stage' + (props.class ? ' ' + props.class : '')} style={{ 'min-height': props.height ?? '240px' }}>
      {props.children}
    </div>
  )
}

/** A wrapping row of buttons, sliders and other inputs. */
export function Controls(props: { children?: JSX.Element }) {
  return <div class="controls">{props.children}</div>
}

export function Button(props: {
  children?: JSX.Element
  onClick?: (event: MouseEvent) => void
  disabled?: boolean
  pressed?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      class="btn"
      disabled={props.disabled}
      aria-pressed={props.pressed === undefined ? undefined : props.pressed ? 'true' : 'false'}
      title={props.title}
      onClick={event => props.onClick?.(event)}
    >
      {props.children}
    </button>
  )
}

/** Labelled live value. Pass a reactive expression: `<Readout label="x" value={x().toFixed(1)} />`. */
export function Readout(props: { label: string; value: JSX.Element; ok?: boolean }) {
  return (
    <div class="readout" data-ok={props.ok === undefined ? undefined : props.ok ? 'true' : 'false'}>
      <span class="readout-label">{props.label}</span>
      <output class="readout-value">{props.value}</output>
    </div>
  )
}
