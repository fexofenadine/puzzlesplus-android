import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { advance, celebrate, lookOf, plan, sparks } from './fireworks'
import { themes } from './themes'
import { random } from './random'

//a context that accepts every call
const fakeContext = () =>
  new Proxy(
    {},
    {
      get: (target, name) => target[name] ?? (() => {}),
      set: (target, name, v) => ((target[name] = v), true),
    },
  )

let frames
beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = '<canvas id="background"></canvas>'
  document.documentElement.dataset.theme = 'synthwave'
  delete document.documentElement.dataset.boss
  frames = []
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('requestAnimationFrame', (fn) => frames.push(fn))
  HTMLCanvasElement.prototype.getContext = fakeContext
})

afterEach(() => {
  vi.unstubAllGlobals()
})

//plays frames at 16ms steps until none are left or the limit passes
const play = (limit = 600) => {
  let time = 0
  while (frames.length && limit-- > 0) frames.shift()((time += 16))
  return limit
}

it('has a look for every theme', () => {
  for (const [id] of themes) expect(lookOf(id).colors.length).toBeGreaterThan(2)
  expect(lookOf('unknown')).toBe(lookOf('classic'))
})

it('plans its bursts in order across the screen', () => {
  const bursts = plan(random(1))
  expect(bursts.length).toBeGreaterThan(4)
  expect(bursts.map((b) => b.at)).toEqual([...bursts.map((b) => b.at)].sort((a, b) => a - b))
  for (const { x, y } of bursts) {
    expect(x).toBeGreaterThan(0.1)
    expect(x).toBeLessThan(0.9)
    expect(y).toBeLessThan(0.6)
  }
})

it('flings sparks out and lets them fall and fade away', () => {
  const look = lookOf('nord')
  let list = sparks(look, 100, 100, random(2))
  expect(list.length).toBeGreaterThan(30)
  list = advance(list, 0.5, look)
  expect(list.some((p) => p.x !== 100)).toBe(true)
  for (let k = 0; k < 40; k++) list = advance(list, 0.1, look)
  expect(list).toEqual([])
  //matrix sparks are glyphs
  expect(sparks(lookOf('matrix'), 0, 0, random(3))[0].char).not.toBe('')
})

it('plays a show behind the windows, then hides its canvas', () => {
  celebrate()
  const canvas = document.body.querySelectorAll('canvas')[1]
  expect(canvas.style.display).toBe('block')
  expect(play()).toBeGreaterThan(0)
  expect(canvas.style.display).toBe('none')
  //a show is not stacked on one in progress
  celebrate()
  celebrate()
  expect(frames.length).toBe(1)
  play()
})

it('stays quiet when off, hidden, reduced or under the boss key', () => {
  localStorage.setItem('fireworks', 'off')
  celebrate()
  expect(frames.length).toBe(0)
  localStorage.clear()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  celebrate()
  expect(frames.length).toBe(0)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  document.documentElement.dataset.boss = 'on'
  celebrate()
  expect(frames.length).toBe(0)
})

it('stops at once when the boss key comes up mid show', () => {
  celebrate()
  frames.shift()(16)
  document.documentElement.dataset.boss = 'on'
  frames.shift()(32)
  expect(frames.length).toBe(0)
  expect(document.body.querySelectorAll('canvas')[1].style.display).toBe('none')
})
