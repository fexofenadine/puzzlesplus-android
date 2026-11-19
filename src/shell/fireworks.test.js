import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { advance, celebrate, fireworksOn, launch, lookOf, sparks, stopFireworks } from './fireworks'
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
const press = (type) => {
  const event = new Event(type)
  Object.defineProperty(event, 'timeStamp', { value: performance.now() + 50 })
  window.dispatchEvent(event)
}

//thousands of frames are stepped through, slow when other tests share the machine
it(
  'keeps launching through presses and keys until a new game, then lets the air clear',
  { timeout: 60000 },
  () => {
    celebrate()
    const canvas = document.body.querySelectorAll('canvas')[1]
    expect(canvas.style.display).toBe('block')
    step(200)
    //typing a name in the best times box or clicking ok goes on with the show
    press('pointerdown')
    press('keydown')
    step(1250)
    expect(frames.length).toBe(1)
    stopFireworks()
    //the rockets and sparks in flight take a few seconds to finish, nothing new goes up
    expect(step(400)).toBeGreaterThan(0)
    expect(frames.length).toBe(0)
    expect(canvas.style.display).toBe('none')
    //with no show playing a new game does nothing
    stopFireworks()
  },
)

it('stops launching after five minutes by itself', { timeout: 60000 }, () => {
  celebrate()
  for (let k = 0; k < 3000 && frames.length; k++) frames.shift()((time += 250))
  expect(frames.length).toBe(0)
  expect(time).toBeGreaterThan(300000)
  expect(time).toBeLessThan(320000)
})

it('keeps time on slow frames, as under a heavy shader', () => {
  celebrate()
  //ten frames a second for three seconds are enough for bursts to be in the air
  for (let k = 0; k < 30; k++) frames.shift()((time += 100))
  expect(frames.length).toBe(1)
  stopFireworks()
  for (let k = 0; k < 100 && frames.length; k++) frames.shift()((time += 100))
  expect(frames.length).toBe(0)
})

it('follows the screen when a phone is turned', () => {
  const [w, h] = [innerWidth, innerHeight]
  celebrate()
  const canvas = document.body.querySelectorAll('canvas')[1]
  step(10)
  expect(canvas.width / canvas.height).toBeCloseTo(w / h, 1)
  vi.stubGlobal('innerWidth', h)
  vi.stubGlobal('innerHeight', w)
  step(1)
  expect(canvas.width / canvas.height).toBeCloseTo(h / w, 1)
  stopFireworks()
  step(400)
})

it('does not stack shows, and a new one can start after one ends', () => {
  celebrate()
  celebrate()
  expect(frames.length).toBe(1)
  stopFireworks()
  step(400)
  celebrate()
  expect(frames.length).toBe(1)
  stopFireworks()
  step(400)
})

it('stays quiet when off, hidden, reduced or under the boss key', () => {
  localStorage.setItem('fireworks', 'off')
  celebrate()
  expect(frames.length).toBe(0)
  localStorage.clear()
  //the system's reduced motion counts only when chosen, full motion is the default
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  localStorage.setItem('motion', 'system')
  celebrate()
  expect(frames.length).toBe(0)
  localStorage.removeItem('motion')
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
