import { readFileSync } from 'node:fs'
import { beforeEach, expect, it } from 'vitest'
import { backgroundFor } from './backgrounds'
import { themes } from './themes'

const script = readFileSync('src/shell/prepaint.js', 'utf8')
const root = document.documentElement

//the page's first paint for a saved theme and background settings
const paint = (theme, backgrounds) => {
  localStorage.clear()
  delete root.dataset.background
  if (theme) localStorage.setItem('theme', theme)
  if (backgrounds) localStorage.setItem('backgrounds', JSON.stringify(backgrounds))
  new Function(script)()
  return root.dataset.background
}

beforeEach(() => localStorage.clear())

it('paints every theme but classic as animated until told otherwise', () => {
  expect(paint(null)).toBe('animated')
  expect(root.dataset.theme).toBe('synthwave')
  for (const [theme] of themes) {
    expect(paint(theme)).toBe(theme === 'classic' ? undefined : 'animated')
  }
  expect(paint('everforest')).toBe('animated')
  expect(paint('terafox-coral')).toBe('animated')
  expect(root.dataset.theme).toBe('terafox')
})

it('keeps the wallpaper for a background that was switched off', () => {
  for (const [theme] of themes) {
    if (theme === 'classic') continue
    const id = backgroundFor(theme)
    expect(paint(theme, { version: 2, [id]: { animated: false } })).toBe(undefined)
    expect(paint(theme, { version: 2, [id]: { animated: true } })).toBe('animated')
    //another background's switch says nothing about this one
    expect(paint(theme, { version: 2, other: { animated: false } })).toBe('animated')
  }
  //classic waits for the script either way, its photo never flashes away
  expect(paint('classic', { version: 2, driftclouds: { animated: true } })).toBe(undefined)
})

it('treats synthwave as on when it was off only by its old default', () => {
  expect(paint('synthwave', { neon: { animated: false } })).toBe('animated')
  expect(paint('synthwave', { version: 1, neon: { animated: false } })).toBe(undefined)
  expect(paint('synthwave', '{oops')).toBe('animated')
})

it('marks full motion, or the saved choice, before the first paint', () => {
  for (const [saved, shown] of [
    ['reduce', 'reduce'],
    ['full', 'full'],
    ['system', undefined],
    ['wild', 'full'],
    [null, 'full'],
  ]) {
    delete root.dataset.motion
    if (saved) localStorage.setItem('motion', saved)
    else localStorage.removeItem('motion')
    new Function(script)()
    expect(root.dataset.motion).toBe(shown)
  }
  delete root.dataset.motion
})

it('marks the screen effects switched off before the first paint', () => {
  paint('synthwave')
  expect(root.dataset.effectsOff).toBe('drop')
  localStorage.setItem('effects', JSON.stringify({ drop: true, scanlines: false }))
  new Function(script)()
  expect(root.dataset.effectsOff).toBe('scanlines')
  localStorage.setItem('effects', '{oops')
  new Function(script)()
  expect(root.dataset.effectsOff).toBe('drop')
})

it('spaces the scanlines a whole number of screen pixels apart at any pixel ratio', () => {
  const periods = {}
  for (const ratio of [1, 1.25, 1.5, 2, 2.625, 3]) {
    window.devicePixelRatio = ratio
    paint('synthwave')
    const period = parseFloat(root.style.getPropertyValue('--scan-period'))
    periods[ratio] = period
    expect(Math.abs(period * ratio - Math.round(period * ratio))).toBeLessThan(1e-9)
    expect(period).toBeGreaterThan(2)
    expect(period).toBeLessThan(4)
  }
  expect(periods[1]).toBe(3)
  window.devicePixelRatio = 1
})
