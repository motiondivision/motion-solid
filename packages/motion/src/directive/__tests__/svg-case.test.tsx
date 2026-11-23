import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { flush } from 'solid-js'
import { attachMotion } from '@/directive'
import { Motion } from '@/index'

// Issue #2: the ref factory lower-cased `tagName`, so camelCase SVG elements were treated as HTML.
describe('attachMotion on camelCase SVG elements', () => {
  it('writes SVG attributes the way <Motion as> does', () => {
    render(() => (
      <svg>
        <Motion as="radialGradient" data-testid="control" initial={{ r: 5, cx: 2 }} />
        <radialGradient data-testid="attached" ref={attachMotion({ initial: { r: 5, cx: 2 } })} />
      </svg>
    ))
    flush()
    const control = document.querySelector('[data-testid="control"]')!
    const attached = document.querySelector('[data-testid="attached"]')!
    expect(attached.getAttribute('r')).toBe('5')
    expect(attached.getAttribute('cx')).toBe('2')
    expect(attached.getAttribute('r')).toBe(control.getAttribute('r'))
    // The attributes are not left behind in style.
    expect((attached as SVGElement).style.getPropertyValue('r')).toBe('')
  })

  it.each(['linearGradient', 'clipPath', 'feGaussianBlur', 'textPath'])('%s is treated as SVG', (tag) => {
    render(() => (
      <svg>
        {(() => {
          const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
          el.setAttribute('data-testid', tag)
          attachMotion({ initial: { pathLength: 0.5, opacity: 0.5 } })(el as unknown as HTMLElement)
          return el as unknown as HTMLElement
        })()}
      </svg>
    ))
    flush()
    const el = document.querySelector(`[data-testid="${tag}"]`)!
    // pathLength is an SVG attribute in motion's SVG renderer and is never written to style for these tags.
    expect((el as SVGElement).style.getPropertyValue('path-length')).toBe('')
    expect(el.getAttribute('pathLength')).not.toBeNull()
  })

  it('still lower-cases HTML tag names', () => {
    const { getByTestId } = render(() => <div data-testid="div" ref={attachMotion({ initial: { opacity: 0.5 } })} />)
    flush()
    expect(getByTestId('div').style.opacity).toBe('0.5')
  })
})
