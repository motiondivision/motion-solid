import { describe, expect, it } from 'vitest'
import { render } from '@solidjs/testing-library'
import { motionValue } from 'motion-dom'
import { Motion, motion } from '@/components/motion'
import { delay } from '@/shared/test'

describe('svg', () => {
  it('should render initial value, writing svg-only values as attributes', async () => {
    const opacity = motionValue(0)
    const stroke = motionValue('red')
    const { getByTestId } = render(() => <Motion as="path" data-testid="path" style={{ opacity, stroke }} />)
    const path = getByTestId('path') as unknown as SVGPathElement
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(path.style.opacity).toBe('0')
    expect(path.style.stroke).toBeFalsy()
    expect(path.getAttribute('stroke')).toBe('red')
    expect(path.getAttribute('opacity')).toBeFalsy()
    opacity.set(1)
    stroke.set('blue')
    await delay(100)
    expect(path.style.opacity).toBe('1')
    expect(path.style.stroke).toBeFalsy()
    expect(path.getAttribute('stroke')).toBe('blue')
    expect(path.getAttribute('opacity')).toBeFalsy()
  })

  it('should update stroke-width through attributes instead of style', async () => {
    const strokeWidth = motionValue(2)
    const { getByTestId } = render(() => <Motion as="path" data-testid="path" style={{ strokeWidth }} />)
    const path = getByTestId('path') as unknown as SVGPathElement
    expect(path.style.strokeWidth).toBeFalsy()
    expect(path.getAttribute('stroke-width')).toBe('2')
    strokeWidth.set(4)
    await delay(100)
    expect(path.style.strokeWidth).toBeFalsy()
    expect(path.getAttribute('stroke-width')).toBe('4')
  })

  it('renders motion.svg and children in the SVG namespace', () => {
    const { container } = render(() => (
      <motion.svg data-testid="svg" viewBox="0 0 10 10">
        <motion.circle data-testid="circle" cx={5} cy={5} r={2} />
      </motion.svg>
    ))
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
    const circle = svg.querySelector('circle')!
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(circle.getAttribute('r')).toBe('2')
  })

  it('animates an svg attribute value', async () => {
    const done = new Promise<void>((resolve) => {
      render(() => (
        <motion.circle
          data-testid="c"
          initial={{ r: 1 } as any}
          animate={{ r: 5 } as any}
          transition={{ duration: 0.01 }}
          onAnimationComplete={() => resolve()}
        />
      ))
    })
    await done
    await delay(30)
    const circle = document.querySelector('[data-testid="c"]')!
    expect(circle.getAttribute('r')).toBe('5')
  })
})
