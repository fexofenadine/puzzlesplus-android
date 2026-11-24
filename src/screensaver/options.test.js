import { beforeEach, expect, it } from 'vitest'
import { loadOptions, randomTheme, saveOptions } from './options'
import { themes } from '../shell/themes'
import { random } from '../shell/random'

beforeEach(() => localStorage.clear())

it('starts on one theme, changing every 5 minutes once random is on, and keeps sane minutes', () => {
  expect(loadOptions()).toEqual({ random: false, minutes: 5, fps: 30, drift: false, saver: true })
  saveOptions({ random: true, minutes: 12, fps: 15, drift: true })
  expect(loadOptions()).toEqual({ random: true, minutes: 12, fps: 15, drift: true, saver: true })
  saveOptions({ random: true, minutes: 12, fps: 15, drift: true, saver: false })
  expect(loadOptions().saver).toBe(false)
  localStorage.setItem(
    'screensaver',
    JSON.stringify({ random: 'yes', minutes: 900, fps: 45, drift: 1 }),
  )
  expect(loadOptions()).toEqual({ random: false, minutes: 5, fps: 30, drift: false, saver: true })
  localStorage.setItem('screensaver', '{oops')
  expect(loadOptions()).toEqual({ random: false, minutes: 5, fps: 30, drift: false, saver: true })
})

it('picks another theme each time, and in time every one', () => {
  const rng = random(7)
  const seen = new Set()
  let theme = 'classic'
  for (let k = 0; k < 200; k++) {
    const next = randomTheme(theme, rng)
    expect(next).not.toBe(theme)
    seen.add(next)
    theme = next
  }
  expect(seen.size).toBe(themes.length)
})
