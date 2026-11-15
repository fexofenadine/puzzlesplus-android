import { beforeEach, expect, it } from 'vitest'
import { backgroundFor, defaults, loadSettings, saveSettings } from '.'
import substrate from './substrate'
import truchet from './truchet'
import phosphor, { loadTexts } from './phosphor'
import { pixel } from './font6x10'
import hill, { hillLayout, noise } from './hill'
import { hueAt, makeShape, stepShape } from './qix'
import { DONE, EMPTY, FADE, network } from './hextrail'
import { adapt } from './neon'
import { ramp, reef } from './coral'
import { random } from '../random'

beforeEach(() => localStorage.clear())

it('maps only the animated themes to a background', () => {
  expect(backgroundFor('matrix')).toBe('matrix')
  expect(backgroundFor('nord')).toBe('substrate')
  expect(backgroundFor('solarized')).toBe('truchet')
  expect(backgroundFor('solarized-phosphor')).toBe('phosphor')
  expect(backgroundFor('classic')).toBe('hill')
  expect(backgroundFor('vaporwave')).toBe('qix')
  expect(backgroundFor('terafox')).toBe('hextrail')
  expect(backgroundFor('terafox-coral')).toBe('coral')
  expect(backgroundFor('synthwave')).toBe('neon')
  expect(backgroundFor('everforest')).toBe(null)
})

it('keeps the tuned matrix look as its defaults', () => {
  expect(defaults('matrix')).toEqual({
    animated: true,
    density: 44,
    speed: 1,
    encoding: 'matrix',
    fog: true,
    waves: true,
  })
})

it('stores every background together and repairs bad values', () => {
  localStorage.setItem(
    'backgrounds',
    JSON.stringify({
      matrix: { density: 500, encoding: 'nope', fog: 'yes' },
      substrate: { sandGrains: 10 },
    }),
  )
  const settings = loadSettings()
  expect(settings.matrix.density).toBe(100)
  expect(settings.matrix.encoding).toBe('matrix')
  expect(settings.matrix.fog).toBe(true)
  expect(settings.substrate.sandGrains).toBe(10)
  expect(settings.substrate.maxCracks).toBe(100)
  saveSettings(settings)
  expect(Object.keys(JSON.parse(localStorage.getItem('backgrounds')))).toEqual([
    'matrix',
    'substrate',
    'truchet',
    'phosphor',
    'hill',
    'qix',
    'hextrail',
    'neon',
    'coral',
  ])
})

it('falls back to the defaults when the stored settings are unreadable', () => {
  localStorage.setItem('backgrounds', '{oops')
  expect(loadSettings().substrate).toEqual(defaults('substrate'))
})

//records what substrate draws instead of painting it
const recorder = () => {
  const calls = []
  return {
    calls,
    globalAlpha: 1,
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push([x, y, w, h, this.globalAlpha])
    },
  }
}

const run = (settings, frames, width = 160, height = 120) => {
  const context = recorder()
  const instance = substrate.create(context, { ...defaults('substrate'), ...settings })
  instance.resize(width, height)
  let now = performance.now()
  for (let n = 0; n < frames; n++) instance.frame((now += 20))
  return context.calls
}

it('grows cracks and sand inside the canvas', () => {
  const calls = run({}, 400)
  const points = calls.filter(([, , w]) => w === 1)
  expect(points.length).toBeGreaterThan(1000)
  expect(points.every(([x, y]) => x >= 0 && x < 160 && y >= 0 && y < 120)).toBe(true)
})

it('starts over after the set number of cycles', () => {
  const clears = (settings) => {
    const context = counter()
    const small = { sandGrains: 8, maxCracks: 20, growthDelay: 1 }
    const instance = substrate.create(context, { ...defaults('substrate'), ...small, ...settings })
    instance.resize(160, 120, 1)
    let now = performance.now()
    for (let n = 0; n < 300; n++) instance.frame((now += 20))
    return context.counts.clears
  }
  expect(clears({ maxCycles: 0 })).toBe(1)
  expect(clears({ maxCycles: 1000 })).toBeGreaterThan(1)
})

it('keeps working with every option at its extremes', () => {
  for (const option of substrate.options.filter((o) => o.type === 'range')) {
    for (const value of [option.min, option.max]) {
      expect(() => run({ [option.key]: value, seamless: true }, 30, 60, 40)).not.toThrow()
    }
  }
  //wireframe draws the cracks alone, with no translucent sand
  const points = run({ wireframe: true }, 200).filter(([, , w]) => w === 1)
  expect(points.length).toBeGreaterThan(0)
  expect(points.every(([, , , , alpha]) => alpha === 1)).toBe(true)
})

it('runs more cycles on a finer canvas, in proportion to its scale', () => {
  //a fixed set of cracks without sand, so only the number of cycles differs
  const fixed = { maxCycles: 0, initialCracks: 11, maxCracks: 11, wireframe: true }
  const count = (pixels) => {
    const context = counter()
    const instance = substrate.create(context, { ...defaults('substrate'), ...fixed })
    instance.resize(160 * pixels, 120 * pixels, pixels)
    let now = performance.now()
    for (let n = 0; n < 40; n++) instance.frame((now += 20))
    return context.counts.fillRect
  }
  //twice the pixels runs twice the cycles, not four times
  const ratio = count(2) / count(1)
  expect(ratio).toBeGreaterThan(1.7)
  expect(ratio).toBeLessThan(2.4)
})

it('gives every background an animated switch, on by default except classic', () => {
  for (const id of ['matrix', 'substrate', 'truchet', 'phosphor'])
    expect(defaults(id).animated).toBe(true)
  //classic keeps the original game's look unless the hill is turned on
  expect(defaults('hill').animated).toBe(false)
})

//a canvas context that only counts what is drawn
const counter = () => {
  const counts = {}
  return new Proxy(
    {
      counts,
      createLinearGradient: () => ({ addColorStop: () => {} }),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    },
    {
      get: (target, key) =>
        key in target
          ? target[key]
          : (...args) => {
              counts[key] = (counts[key] || 0) + 1
              //a fill wider than a pixel is a clear of the whole picture
              if (key === 'fillRect' && args[2] > 1) counts.clears = (counts.clears || 0) + 1
            },
      set: () => true,
    },
  )
}

it('draws truchet tiles and scrolls them, then lays down a new pattern', () => {
  const context = counter()
  const instance = truchet.create(context, { ...defaults('truchet'), animDelay: 10, animStep: 9 })
  instance.resize(320, 200, 1)
  const drawn = context.counts.ellipse || context.counts.lineTo
  expect(drawn).toBeGreaterThan(0)
  let now = performance.now()
  for (let n = 0; n < 200; n++) instance.frame((now += 20))
  expect(context.counts.stroke).toBeGreaterThan(100)
  expect(instance.still()).toBe(true)
})

it('draws straight truchet tiles only when curves are off', () => {
  const context = counter()
  truchet.create(context, { ...defaults('truchet'), curves: false }).resize(320, 200, 1)
  expect(context.counts.ellipse).toBeUndefined()
  expect(context.counts.lineTo).toBeGreaterThan(0)
})

it('has the 6x10 font glyphs', () => {
  const rows = (c) =>
    Array.from({ length: 10 }, (_, y) =>
      Array.from({ length: 7 }, (_, x) => (pixel(c.charCodeAt(0), x, y) ? '#' : '.')).join(''),
    )
  expect(rows('A').slice(1, 8)).toEqual([
    '...#...',
    '..#.#..',
    '.#...#.',
    '.#...#.',
    '.#####.',
    '.#...#.',
    '.#...#.',
  ])
  expect(rows(' ').join('')).not.toContain('#')
})

it('types the game source into phosphor and fades it', async () => {
  const files = await loadTexts()
  expect(files.some(({ name }) => name === 'src/mines.js')).toBe(true)
  expect(files.some(({ name }) => name.includes('.test.'))).toBe(false)
  const context = counter()
  const instance = phosphor.create(context, { ...defaults('phosphor'), delay: 10 })
  instance.resize(600, 400, 1)
  let now = performance.now()
  for (let n = 0; n < 50; n++) instance.frame((now += 80))
  await new Promise((resolve) => setTimeout(resolve, 10))
  for (let n = 0; n < 50; n++) instance.frame((now += 80))
  expect(context.counts.stroke).toBeGreaterThan(50)
})

it('grows a whole substrate picture for the still background, then stops', () => {
  const context = counter()
  const small = { maxCycles: 300, maxCracks: 20, sandGrains: 8 }
  const instance = substrate.create(context, { ...defaults('substrate'), ...small })
  instance.resize(160, 120, 1)
  let done = false
  let calls = 0
  while (!done && calls++ < 1000) done = instance.still(performance.now())
  expect(done).toBe(true)
  //blended in memory, not drawn grain by grain
  expect(context.counts.putImageData).toBeGreaterThan(0)
  expect(context.counts.fillRect).toBe(1)
  //finished pictures stay put
  const puts = context.counts.putImageData
  expect(instance.still(performance.now())).toBe(true)
  expect(context.counts.putImageData).toBe(puts)
})

it('puts the hill ridge where bliss has it and keeps the grass to the bottom', () => {
  for (const [w, h] of [
    [1920, 1080],
    [1280, 1024],
    [390, 844],
    [3840, 1200],
  ]) {
    const { x, y, w: hw, h: hh } = hillLayout(w, h)
    expect(y / h).toBeCloseTo(0.53)
    expect(y + hh).toBeGreaterThanOrEqual(h - 1)
    expect(hw).toBeGreaterThanOrEqual(w - 1)
    expect(x).toBeLessThanOrEqual(0)
  }
})

it('makes smooth noise between 0 and 1', () => {
  const values = Array.from({ length: 200 }, (_, i) => noise(i * 0.37, i * 0.11, 3))
  expect(Math.min(...values)).toBeGreaterThanOrEqual(0)
  expect(Math.max(...values)).toBeLessThanOrEqual(1)
  expect(Math.abs(noise(1.5, 2.5, 1) - noise(1.501, 2.5, 1))).toBeLessThan(0.01)
})

it('draws the sky every frame and drifts the clouds', () => {
  const context = counter()
  const instance = hill.create(context, { ...defaults('hill'), animated: true })
  instance.resize(800, 600, 1)
  let now = performance.now()
  for (let n = 0; n < 30; n++) instance.frame((now += 16))
  expect(context.counts.fillRect).toBeGreaterThanOrEqual(31)
})

it('draws substrate as finely as its detail setting asks', () => {
  expect(substrate.ratio(2, { detail: 'original' })).toBe(1)
  expect(substrate.ratio(2, { detail: 'balanced' })).toBe(1.5)
  expect(substrate.ratio(1.25, { detail: 'balanced' })).toBe(1.25)
  expect(substrate.ratio(2, { detail: 'sharp' })).toBe(2)
  expect(defaults('substrate').detail).toBe('balanced')
})

it('bounces a shape inside the screen and keeps a trail no longer than asked', () => {
  const rng = random(3)
  const shape = makeShape(4, 200, 100, 7, rng)
  for (let k = 0; k < 400; k++) {
    stepShape(shape, 200, 100, 12)
    for (const p of shape.points) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(200)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(100)
    }
  }
  expect(shape.trail).toHaveLength(12)
  //colours run round the palette and meet themselves again
  const colours = [
    [0, 0, 0],
    [100, 200, 50],
  ]
  expect(hueAt(colours, 0.5)).toEqual([50, 100, 25])
  expect(hueAt(colours, 2)).toEqual([0, 0, 0])
})

it('grows a hex trail arm by arm into empty hexagons, then fades and starts again', () => {
  const rng = random(11)
  const { plane, tick } = network(8, 8, 8, rng)
  let faded = false
  let most = 0
  for (let k = 0; k < 20000; k++) {
    tick(2)
    //an arm that is done is matched by one in the neighbour it leads to
    if (k % 50 === 0) {
      for (const h of plane.hexagons) {
        h.arms.forEach((arm, j) => {
          if (arm.state !== DONE) return
          expect(h.neighbors[j]).toBeTruthy()
          expect(h.neighbors[j].arms[(j + 3) % 6].state).not.toBe(EMPTY)
        })
      }
      most = Math.max(
        most,
        plane.hexagons.filter((h) => h.arms.some((a) => a.state !== EMPTY)).length,
      )
    }
    if (plane.state === FADE) faded = true
    //after the fade the plane is empty again and a new network begins
    if (faded && plane.state !== FADE) break
  }
  expect(faded).toBe(true)
  expect(plane.state).not.toBe(FADE)
  //most of the plane was reached before it ran out of room
  expect(most).toBeGreaterThan(32)
})

it('lowers the shader quality while a draw is slow and gives up only at the lowest', () => {
  expect(adapt(1, 12)).toBe(1)
  expect(adapt(1, 30)).toBeCloseTo(0.7)
  expect(adapt(0.4, 30)).toBe(0.3)
  //at the lowest size a slowish draw is put up with, a hopeless one is not
  expect(adapt(0.3, 30)).toBe(0.3)
  expect(adapt(0.3, 60)).toBe(null)
})

it('grows coral from its seeds: every cell that freezes touches coral, and the walkers run out', () => {
  const cols = 40
  const rows = 30
  const set = new Set()
  const plots = []
  const growth = reef(cols, rows, { seeds: 3, density: 25 }, random(7), (x, y, shade) => {
    plots.push([x, y, shade])
    set.add(y * cols + x)
  })
  const seeds = plots.length
  expect(seeds).toBeGreaterThan(0)
  expect(growth.total).toBe(300)
  let steps = 0
  while (growth.step() && steps++ < 20000);
  expect(growth.left()).toBe(0)
  //nothing freezes twice, and all but the seeds joined something already there
  expect(set.size).toBe(plots.length)
  const seen = new Set()
  plots.forEach(([x, y], k) => {
    if (k >= seeds) {
      const near = [-1, 0, 1].some((dy) =>
        [-1, 0, 1].some((dx) => (dx || dy) && seen.has((y + dy) * cols + x + dx)),
      )
      expect(near).toBe(true)
    }
    seen.add(y * cols + x)
  })
  //shades only move forward as it grows
  expect(plots.every(([, , shade], k) => k === 0 || shade >= plots[k - 1][2])).toBe(true)
})

it('fades the coral toward the ground as its strength drops', () => {
  expect(ramp(['#ffffff', '#ffffff'], 1, 2)).toEqual(['rgb(255 255 255)', 'rgb(255 255 255)'])
  expect(ramp(['#ffffff', '#ffffff'], 0, 2)).toEqual(['rgb(15 28 30)', 'rgb(15 28 30)'])
})
