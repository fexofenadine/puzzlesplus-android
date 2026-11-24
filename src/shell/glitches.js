import { load, remove, save } from './storage'
import { reduced } from './motion'

//the retro themes' screen effects, each switched on or off from view → glitches
//steady ones (scanlines and the like) are css switched by the root's data-effects-off
//now-and-then ones fire at random gaps, set data-glitch for a moment and vary their look each time

const retro = ['synthwave', 'vaporwave', 'matrix']

//name, the themes that have it, now and then or steady, whether it starts off
//and whether it shows only over the animated background
export const effects = [
  { id: 'jump', name: 'Picture jumps', themes: ['synthwave', 'vaporwave'], glitch: true },
  { id: 'tear', name: 'Torn bands', themes: ['synthwave', 'matrix'], glitch: true, moving: true },
  { id: 'burst', name: 'Static bursts', themes: ['synthwave'], glitch: true },
  { id: 'corrupt', name: 'Corrupted columns', themes: ['matrix'], glitch: true, moving: true },
  { id: 'drop', name: 'Signal drops', themes: ['matrix'], glitch: true, off: true, moving: true },
  { id: 'lcd', name: 'Counter glitches', themes: retro, glitch: true },
  { id: 'lost', name: 'Meltdown when a game is lost', themes: retro, glitch: true },
  { id: 'scanlines', name: 'Scanlines', themes: retro },
  { id: 'band', name: 'Tracking band', themes: retro },
  { id: 'grain', name: 'Tape grain', themes: ['synthwave', 'vaporwave'] },
  { id: 'flicker', name: 'Flicker', themes: retro },
]

export const effectsOf = (theme) => effects.filter((effect) => effect.themes.includes(theme))

export const defaultEffects = () =>
  Object.fromEntries(effects.map((effect) => [effect.id, !effect.off]))

//saved as the choices that differ from the defaults
export const loadEffects = () => {
  const on = defaultEffects()
  try {
    const saved = JSON.parse(load('effects'))
    for (const id in on) if (typeof saved?.[id] === 'boolean') on[id] = saved[id]
  } catch {
    //nothing saved, or not readable
  }
  return on
}

let current = null
const chosen = () => (current ??= loadEffects())

//the space separated list of effects switched off, as the css reads it
export const offList = (on) =>
  effects
    .filter((effect) => !on[effect.id])
    .map((effect) => effect.id)
    .join(' ')

export const applyEffects = (on) => {
  current = on
  const root = globalThis.document?.documentElement
  if (root) root.dataset.effectsOff = offList(on)
}

export const saveEffects = (on) => {
  const defaults = defaultEffects()
  const changed = Object.fromEntries(Object.entries(on).filter(([id, v]) => v !== defaults[id]))
  if (Object.keys(changed).length) save('effects', JSON.stringify(changed))
  else remove('effects')
  applyEffects(on)
}

//seconds between glitches, by effect and theme, around the rates the fixed loops had
export const gaps = {
  jump: { synthwave: [2, 5.5], vaporwave: [7, 16] },
  tear: { synthwave: [3, 7], matrix: [6, 14] },
  burst: { synthwave: [7, 15] },
  corrupt: { matrix: [7, 15] },
  drop: { matrix: [10, 20] },
  lcd: { synthwave: [0.8, 3], vaporwave: [0.8, 3], matrix: [0.8, 3] },
}

const between = (low, high, rng = Math.random) => low + rng() * (high - low)
const pick = (rng, list) => list[Math.floor(rng() * list.length)]
const sign = (rng) => (rng() < 0.5 ? -1 : 1)
const px = (value) => `${value.toFixed(1)}px`
const deg = (value) => `${value.toFixed(1)}deg`

//a band from top to top + height, in percent of the screen
const band = (top, height) => [top, Math.min(100, top + height)]
const bands = (list) =>
  `polygon(${list.map(([a, b]) => `0 ${a}%, 100% ${a}%, 100% ${b}%, 0 ${b}%`).join(', ')})`

//one step, or two in a row when chance comes up
const oneOrTwo = (rng, chance, step, ms, alone = ms) =>
  rng() < chance
    ? [
        [step(), ms],
        [step(), ms],
      ]
    : [[step(), alone]]

//each glitch's steps, under its id or theme:id where a theme plays it its own way
const makers = {
  'vaporwave:jump': (rng) => {
    const x = between(4, 9, rng) * sign(rng)
    return [
      [{ '--jump-x': px(x), '--jump-skew': deg(-x / 12) }, 70],
      [{ '--jump-x': px(-x * between(0.3, 0.7, rng)), '--jump-skew': '0deg' }, 70],
    ]
  },
  jump: (rng) =>
    oneOrTwo(
      rng,
      0.6,
      () => ({
        '--jump-x': px(between(6, 16, rng) * sign(rng)),
        '--jump-y': px(between(-3, 6, rng)),
        '--jump-skew': deg(between(-4, 4, rng)),
        '--jump-hue': deg(between(15, 40, rng) * sign(rng)),
        '--jump-bright': between(0.9, 1.5, rng).toFixed(2),
        '--jump-sat': between(0.4, 1.8, rng).toFixed(2),
      }),
      70,
    ),
  'matrix:tear': (rng) =>
    oneOrTwo(
      rng,
      0.7,
      () => ({
        bands: Array.from({ length: 2 + Math.floor(rng() * 2) }, () => ({
          top: between(0, 0.88, rng),
          height: between(0.02, 0.11, rng),
          dx: between(15, 70, rng) * sign(rng),
        })),
      }),
      90,
      120,
    ),
  tear: (rng) =>
    oneOrTwo(
      rng,
      0.7,
      () => ({
        '--tear-clip': bands([
          band(between(5, 80, rng), between(2, 7, rng)),
          band(between(5, 90, rng), between(1, 3, rng)),
        ]),
        '--tear-hue': deg(between(120, 180, rng)),
      }),
      180,
      220,
    ),
  burst: (rng) => [[{}, between(200, 450, rng)]],
  corrupt: (rng) => [
    [
      {
        columns: Array.from({ length: 3 + Math.floor(rng() * 3) }, () => ({
          x: rng(),
          top: between(0, 0.6, rng),
          length: 6 + Math.floor(rng() * 14),
        })),
      },
      between(450, 900, rng),
    ],
  ],
  drop: (rng) => [
    [{ dim: between(0.5, 0.8, rng) }, between(70, 130, rng)],
    [{ roll: true }, between(250, 400, rng)],
  ],
  lcd: (rng) =>
    oneOrTwo(
      rng,
      0.5,
      () => {
        const top = rng() < 0.6 ? between(0, 50, rng) : 0
        const bottom = top ? between(10, 40, rng) : rng() < 0.4 ? 55 : 0
        return {
          '--lcd-move': `translate(${px(between(1, 3, rng) * sign(rng))}, ${px(between(-1, 1, rng))}) skewX(${deg(rng() < 0.4 ? between(-6, 6, rng) : 0)})`,
          '--lcd-clip':
            top || bottom ? `inset(${top.toFixed(0)}% 0 ${bottom.toFixed(0)}% 0)` : 'none',
          '--lcd-fringe': px(between(2, 3.5, rng)),
          '--lcd-hue': rng() < 0.3 ? '60deg' : '0deg',
        }
      },
      106,
    ),
}

//the steps of one glitch: [css variables, milliseconds] in turn, all made fresh each time
export const stepsOf = (id, theme, rng = Math.random) =>
  (makers[`${theme}:${id}`] || makers[id] || (() => []))(rng)

//matrix's glitches draw on a canvas over the rain, copying from the rain's own canvas
const canvasGlitches = new Set(['tear', 'corrupt', 'drop'])
const drawn = (id, theme) => theme === 'matrix' && canvasGlitches.has(id)

const playing = new Map()
let layer = null
let drawing = false

const source = () =>
  [...document.querySelectorAll('body > canvas')].find(
    (canvas) => canvas !== layer && canvas.style.display === 'block',
  )

const glyphs = '▓▒░█▄▀■□◆◇╳╱╲┼╪╬#%&@$'

const paint = (context, rain, w, h, id, step) => {
  if (id === 'tear') {
    for (const { top, height, dx } of step.bands) {
      const y = top * h
      const bh = Math.max(4, height * h)
      context.fillStyle = '#000'
      context.fillRect(0, y, w, bh)
      context.drawImage(rain, 0, y, w, bh, dx, y, w, bh)
      context.fillStyle = 'rgba(44, 255, 110, 0.35)'
      context.fillRect(0, y, w, 1)
    }
  } else if (id === 'corrupt') {
    const size = Math.round(h / 40)
    step.frozen ??= (() => {
      const copy = document.createElement('canvas')
      copy.width = w
      copy.height = h
      copy.getContext('2d').drawImage(rain, 0, 0)
      return copy
    })()
    context.font = `${size}px monospace`
    context.textAlign = 'center'
    for (const column of step.columns) {
      //the column freezes, then garbled blocks run down it
      const x = Math.round(column.x * w)
      context.fillStyle = '#000'
      context.fillRect(x - size, 0, size * 2, h)
      context.drawImage(step.frozen, x - size, 0, size * 2, h, x - size, 0, size * 2, h)
      for (let k = 0; k < column.length; k++) {
        context.fillStyle = Math.random() < 0.15 ? '#d4ffe0' : '#2cff6e'
        context.globalAlpha = 0.5 + Math.random() * 0.5
        const nudge = Math.random() < 0.2 ? (Math.random() - 0.5) * size : 0
        context.fillText(pick(Math.random, glyphs), x + nudge, column.top * h + k * size * 1.15)
      }
      context.globalAlpha = 1
    }
  } else if (id === 'drop') {
    if (step.dim) {
      context.fillStyle = `rgba(0, 0, 0, ${step.dim})`
      context.fillRect(0, 0, w, h)
    } else {
      //a dark band rolls down the picture
      step.start ??= performance.now()
      const y = ((performance.now() - step.start) / 300) * h * 1.2 - h * 0.1
      const shade = context.createLinearGradient(0, y - 60, 0, y + 60)
      shade.addColorStop(0, 'rgba(0, 0, 0, 0)')
      shade.addColorStop(0.5, 'rgba(0, 0, 0, 1)')
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = shade
      context.fillRect(0, y - 60, w, 120)
    }
  }
}

const draw = () => {
  const rain = source()
  const active = [...playing].filter(([id]) => canvasGlitches.has(id))
  if (!rain || !active.length) {
    layer.style.display = 'none'
    drawing = false
    return
  }
  if (layer.width !== rain.width || layer.height !== rain.height) {
    layer.width = rain.width
    layer.height = rain.height
  }
  layer.style.filter = rain.style.filter
  layer.style.display = 'block'
  const context = layer.getContext('2d')
  context.clearRect(0, 0, layer.width, layer.height)
  for (const [id, step] of active) paint(context, rain, layer.width, layer.height, id, step)
  requestAnimationFrame(draw)
}

const drawOn = () => {
  if (!layer) {
    layer = document.createElement('canvas')
    layer.id = 'glitch'
    layer.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
  }
  const rain = source()
  if (!rain || !layer.getContext?.('2d')) return false
  if (layer.previousElementSibling !== rain) rain.after(layer)
  if (!drawing) {
    drawing = true
    requestAnimationFrame(draw)
  }
  return true
}

//the glitches showing now, for the css
const mark = (root) => {
  const ids = [...playing.keys()]
  if (ids.length) root.dataset.glitch = ids.join(' ')
  else delete root.dataset.glitch
}

//plays one glitch's steps, then clears its variables
export const play = (id, theme, rng = Math.random) => {
  const root = document.documentElement
  if (playing.has(id)) return
  const steps = stepsOf(id, theme, rng)
  if (!steps.length) return
  const canvas = drawn(id, theme)
  if (canvas && root.dataset.background !== 'animated') return
  const names = new Set(steps.flatMap(([vars]) => Object.keys(vars).filter((k) => k[0] === '-')))
  const run = (k) => {
    if (k === steps.length) {
      playing.delete(id)
      for (const name of names) root.style.removeProperty(name)
      mark(root)
      return
    }
    const [vars, ms] = steps[k]
    for (const [name, value] of Object.entries(vars)) {
      if (name[0] === '-') root.style.setProperty(name, value)
    }
    playing.set(id, vars)
    mark(root)
    setTimeout(() => run(k + 1), ms)
  }
  run(0)
  if (canvas && !drawOn()) {
    playing.delete(id)
    mark(root)
  }
}

//now-and-then glitches wait for a visible page, no boss screen and full motion
const ready = (id, root) => chosen()[id] && !document.hidden && !root.dataset.boss && !reduced()

let started = false

//each glitch keeps its own clock, its next gap drawn from the theme shown when it fires
export const startGlitches = () => {
  if (started) return
  started = true
  const root = document.documentElement
  applyEffects(chosen())
  for (const id of Object.keys(gaps)) {
    const next = (first) => {
      const gap = gaps[id][root.dataset.theme]
      if (!gap) return setTimeout(() => next(true), 2000)
      setTimeout(
        () => {
          const theme = root.dataset.theme
          if (gaps[id][theme] && ready(id, root)) play(id, theme)
          next(false)
        },
        between(first ? 0.5 : 1, 1, Math.random) * between(...gap) * 1000,
      )
    }
    next(true)
  }
}
