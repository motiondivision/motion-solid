import { vi } from 'vitest'

/**
 * A controllable `IntersectionObserver` for jsdom (which has none). Install it in a test with
 * `installIntersectionObserver()`; every observer created is listed in `observers`, remembers
 * its constructor options and observed elements, and `trigger` reports an intersection change.
 */
export class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []

  readonly elements = new Set<Element>()
  disconnected = false

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    MockIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
    this.disconnected = true
  }

  takeRecords() {
    return []
  }

  /** Report that `element` is (or is no longer) intersecting. Ignored if it is not observed. */
  trigger(element: Element, isIntersecting: boolean) {
    if (!this.elements.has(element))
      return
    this.callback(
      [{ target: element, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

export function installIntersectionObserver() {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  return MockIntersectionObserver
}

/** Report an intersection change on every live observer that watches `element`. */
export function triggerIntersection(element: Element, isIntersecting: boolean) {
  for (const observer of MockIntersectionObserver.instances)
    observer.trigger(element, isIntersecting)
}

/** Observers that are still watching `element`. */
export function observersOf(element: Element) {
  return MockIntersectionObserver.instances.filter(observer => observer.elements.has(element))
}
