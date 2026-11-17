import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { applyMotion, loadMotion, reduced, saveMotion } from './motion'
import { celebrate, stopFireworks } from './fireworks'

const root = document.documentElement

//a system that asks for reduced motion, or not
const system = (reduce) =>
  vi.stubGlobal('matchMedia', (query) => ({ matches: reduce && query.includes('reduce') }))

beforeEach(() => {
  localStorage.clear()
  delete root.dataset.motion
})

afterEach(() => vi.unstubAllGlobals())

it('moves fully until another choice is made', () => {
  expect(loadMotion()).toBe('full')
  system(true)
  expect(reduced()).toBe(false)
})

it('follows the system when asked to', () => {
  saveMotion('system')
  expect(root.dataset.motion).toBe(undefined)
  expect(localStorage.getItem('motion')).toBe('system')
  system(true)
  expect(reduced()).toBe(true)
  system(false)
  expect(reduced()).toBe(false)
})

it('overrules the system either way and remembers the choice', () => {
  system(true)
  saveMotion('full')
  expect(root.dataset.motion).toBe('full')
  expect(reduced()).toBe(false)
  expect(localStorage.getItem('motion')).toBe(null)
  system(false)
  saveMotion('reduce')
  expect(reduced()).toBe(true)
  expect(loadMotion()).toBe('reduce')
})

it('ignores a saved value it does not know', () => {
  localStorage.setItem('motion', 'wild')
  expect(loadMotion()).toBe('full')
})

it('shows fireworks under full motion though the system asks for less', () => {
  system(true)
  saveMotion('system')
  const frames = vi.fn()
  vi.stubGlobal('requestAnimationFrame', frames)
  const context = { setTransform() {}, clearRect() {} }
  const canvas = document.createElement('canvas')
  canvas.id = 'fireworks'
  canvas.getContext = () => context
  document.body.append(canvas)
  celebrate('takuzu', 'nord')
  expect(frames).not.toHaveBeenCalled()
  applyMotion('full')
  celebrate('takuzu', 'nord')
  expect(frames).toHaveBeenCalled()
  stopFireworks()
  canvas.remove()
})
