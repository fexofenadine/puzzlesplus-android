import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  applyEffects,
  defaultEffects,
  effects,
  effectsOf,
  gaps,
  loadEffects,
  offList,
  play,
  saveEffects,
  startGlitches,
  stepsOf,
} from './glitches'
import { random } from './random'

const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  root.removeAttribute('style')
  delete root.dataset.glitch
  delete root.dataset.boss
  root.dataset.theme = 'synthwave'
  root.dataset.motion = 'full'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('has every effect on but signal drops, and only the retro themes have any', () => {
  const on = defaultEffects()
  expect(Object.values(on).filter((v) => !v).length).toBe(1)
  expect(on.drop).toBe(false)
  expect(offList(on)).toBe('drop')
  for (const theme of ['classic', 'nord', 'terafox']) expect(effectsOf(theme)).toEqual([])
  expect(effectsOf('matrix').map((e) => e.id)).toEqual(
    expect.arrayContaining(['tear', 'corrupt', 'drop', 'lcd', 'scanlines']),
  )
  //every glitch that comes now and then has gaps for each of its themes, but the meltdown
  for (const effect of effects.filter((e) => e.glitch && e.id !== 'lost'))
    for (const theme of effect.themes) expect(gaps[effect.id][theme]).toBeTruthy()
})

it('saves only the choices that differ from the defaults', () => {
  saveEffects({ ...defaultEffects(), scanlines: false, drop: true })
  expect(JSON.parse(localStorage.getItem('effects'))).toEqual({ scanlines: false, drop: true })
  expect(root.dataset.effectsOff).toBe('scanlines')
  expect(loadEffects().drop).toBe(true)
  saveEffects(defaultEffects())
  expect(localStorage.getItem('effects')).toBe(null)
  localStorage.setItem('effects', '{oops')
  expect(loadEffects()).toEqual(defaultEffects())
})

it('varies each glitch: two draws of the same one look different', () => {
  for (const [id, themes] of Object.entries(gaps)) {
    for (const theme of Object.keys(themes)) {
      const a = stepsOf(id, theme, random(1))
      expect(a.length).toBeGreaterThan(0)
      for (const [, ms] of a) expect(ms).toBeLessThan(1000)
      if (id !== 'burst')
        expect(JSON.stringify(stepsOf(id, theme, random(2)))).not.toBe(JSON.stringify(a))
    }
  }
})

it('marks a glitch on the root for its steps, then clears it and its variables', () => {
  play('jump', 'synthwave', random(3))
  expect(root.dataset.glitch).toBe('jump')
  expect(root.style.getPropertyValue('--jump-x')).not.toBe('')
  vi.advanceTimersByTime(200)
  expect(root.dataset.glitch).toBe(undefined)
  expect(root.style.getPropertyValue('--jump-x')).toBe('')
  //matrix's canvas glitches need the rain on screen
  play('tear', 'matrix', random(4))
  expect(root.dataset.glitch).toBe(undefined)
})

it('fires glitches at random gaps, never when switched off or motion is reduced', () => {
  const seen = new Set()
  applyEffects({ ...defaultEffects(), jump: false })
  root.dataset.motion = 'reduce'
  startGlitches()
  applyEffects({ ...defaultEffects(), jump: false })
  for (let k = 0; k < 300; k++) {
    vi.advanceTimersByTime(100)
    if (root.dataset.glitch) seen.add(root.dataset.glitch)
  }
  expect(seen.size).toBe(0)
  root.dataset.motion = 'full'
  for (let k = 0; k < 600; k++) {
    vi.advanceTimersByTime(50)
    if (root.dataset.glitch) for (const id of root.dataset.glitch.split(' ')) seen.add(id)
  }
  expect(seen.has('lcd')).toBe(true)
  expect(seen.has('burst')).toBe(true)
  expect(seen.has('jump')).toBe(false)
})
