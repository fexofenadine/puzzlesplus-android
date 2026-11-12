import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { advance, celebrate, fireworksOn, launch, lookOf, sparks } from './fireworks'
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
  time = 0
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('requestAnimationFrame', (fn) => frames.push(fn))
  HTMLCanvasElement.prototype.getContext = fakeContext
})

afterEach(() => {
  vi.unstubAllGlobals()
})

//plays up to n frames at 16ms steps and says how many were not needed
let time
const step = (n) => {
  while (frames.length && n > 0) {
    frames.shift()((time += 16))
    n--
  }
  return n
}

it('has a look for every theme', () => {
  for (const [id] of themes) expect(lookOf(id).colors.length).toBeGreaterThan(2)
  expect(lookOf('unknown')).toBe(lookOf('classic'))
})

it('launches rockets across the screen, a moment apart', () => {
  const rng = random(1)
  for (let k = 0; k < 50; k++) {
    const { x, y, wait } = launch(rng)
    expect(x).toBeGreaterThan(0.1)
    expect(x).toBeLessThan(0.9)
    expect(y).toBeLessThan(0.6)
    expect(wait).toBeGreaterThan(0.25)
    expect(wait).toBeLessThan(0.8)
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

//a press or key that happens after the show began
const press = (type, props = {}) => {
  const event = new Event(type)
  Object.defineProperty(event, 'timeStamp', { value: performance.now() + 50 })
  for (const [name, value] of Object.entries(props)) Object.defineProperty(event, name, { value })
  window.dispatchEvent(event)
}

it('keeps launching until a press, then lets what is in the air finish', () => {
  celebrate()
  const canvas = document.body.querySelectorAll('canvas')[1]
  expect(canvas.style.display).toBe('block')
  //well past the old few seconds, still going
  step(1250)
  expect(frames.length).toBe(1)
  press('pointerdown')
  //the rockets and sparks in flight take a few seconds to finish, nothing new goes up
  expect(step(400)).toBeGreaterThan(0)
  expect(frames.length).toBe(0)
  expect(canvas.style.display).toBe('none')
})

it('ends on a key too, but not on one held down or one from before the show', () => {
  celebrate()
  step(100)
  press('keydown', { repeat: true })
  const early = new Event('pointerdown')
  Object.defineProperty(early, 'timeStamp', { value: 0 })
  window.dispatchEvent(early)
  window.dispatchEvent(new Event('mousemove'))
  step(300)
  expect(frames.length).toBe(1)
  press('keydown')
  step(400)
  expect(frames.length).toBe(0)
})

it('stops launching after two minutes by itself', () => {
  celebrate()
  //50ms steps are the longest the show takes, so two minutes need fewer frames
  for (let k = 0; k < 3000 && frames.length; k++) frames.shift()((time += 50))
  expect(frames.length).toBe(0)
  expect(time).toBeGreaterThan(120000)
})

it('does not stack shows, and a new one can start after one ends', () => {
  celebrate()
  celebrate()
  expect(frames.length).toBe(1)
  press('pointerdown')
  step(400)
  celebrate()
  expect(frames.length).toBe(1)
  press('pointerdown')
  step(400)
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

it('keeps classic minesweeper quiet unless its own setting is on', () => {
  celebrate('minesweeper', 'classic')
  expect(frames.length).toBe(0)
  expect(fireworksOn('takuzu', 'classic')).toBe(true)
  expect(fireworksOn('minesweeper', 'nord')).toBe(true)
  localStorage.setItem('minesweeper.fireworks', 'on')
  localStorage.setItem('fireworks', 'off')
  expect(fireworksOn('minesweeper', 'classic')).toBe(true)
  expect(fireworksOn('minesweeper', 'nord')).toBe(false)
  localStorage.clear()
})

it('stops at once when the boss key comes up mid show', () => {
  celebrate()
  frames.shift()(16)
  document.documentElement.dataset.boss = 'on'
  frames.shift()(32)
  expect(frames.length).toBe(0)
  expect(document.body.querySelectorAll('canvas')[1].style.display).toBe('none')
})
