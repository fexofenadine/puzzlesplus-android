import { load, save } from '../storage'
import * as backgrounds from './meta'
import { startGlitches } from '../glitches'

//each background is described in meta.js and drawn by its own file, loaded when first shown
//its create(context, settings) returns { configure, resize(w, h, scale), frame(now), still?(now) }
export { backgrounds }

const loaders = {
  matrix: () => import('./matrix'),
  substrate: () => import('./substrate'),
  truchet: () => import('./truchet'),
  phosphor: () => import('./phosphor'),
  driftclouds: () => import('./driftclouds'),
  qix: () => import('./qix'),
  hextrail: () => import('./hextrail'),
  neon: () => import('./neon'),
}

//which theme shows which background
const themeBackgrounds = {
  classic: 'driftclouds',
  matrix: 'matrix',
  nord: 'substrate',
  solarized: 'truchet',
  'solarized-phosphor': 'phosphor',
  synthwave: 'neon',
  vaporwave: 'qix',
  terafox: 'hextrail',
}

export const backgroundFor = (theme) => themeBackgrounds[theme] || null

//every background can be switched off
export const optionsOf = (id) => [
  { key: 'animated', label: 'Animated', type: 'toggle', value: backgrounds[id].animated ?? true },
  ...backgrounds[id].options,
]

export const defaults = (id) =>
  Object.fromEntries(optionsOf(id).map((option) => [option.key, option.value]))

//keep a stored value only if it still fits its option
const clean = (option, value) => {
  if (option.type === 'toggle') return typeof value === 'boolean' ? value : option.value
  if (option.type === 'select') {
    return option.choices.some(([choice]) => choice === value) ? value : option.value
  }
  const number = Number(value)
  if (value === null || value === '' || !Number.isFinite(number)) return option.value
  return Math.min(option.max, Math.max(option.min, number))
}

//settings whose defaults changed, dropped once from saved settings so everyone gets the new ones
//version 1: synthwave's shader on at 0.2x, hex trail outlined, finer phosphor
//version 2: hex trail back at its own speed
const VERSION = 2
const upgrades = {
  1: {
    neon: ['animated', 'speed', 'resolution'],
    hextrail: ['speed', 'size', 'thickness', 'borders'],
    phosphor: ['scale'],
  },
  2: { hextrail: ['speed'] },
}

export const upgrade = (stored) => {
  for (let version = (stored.version || 0) + 1; version <= VERSION; version++) {
    for (const [id, keys] of Object.entries(upgrades[version])) {
      for (const key of keys) delete stored[id]?.[key]
    }
  }
  return stored
}

//every background's settings live together under one key, used or not
export const loadSettings = () => {
  let stored = {}
  try {
    stored = JSON.parse(load('backgrounds')) || {}
  } catch {
    //unreadable settings fall back to the defaults
  }
  const old = Object.keys(stored).length && (stored.version || 0) < VERSION
  if (old) upgrade(stored)
  const loaded = Object.fromEntries(
    Object.keys(backgrounds).map((id) => [
      id,
      Object.fromEntries(
        optionsOf(id).map((option) => [option.key, clean(option, stored[id]?.[option.key])]),
      ),
    ]),
  )
  if (old) saveSettings(loaded)
  return loaded
}

export const saveSettings = (settings) =>
  save('backgrounds', JSON.stringify({ ...settings, version: VERSION }))

let settings = loadSettings()
const instances = {}
let refresh = () => {}
//backgrounds that could not run here, shown as their wallpaper for the rest of the visit
//switching one on again gives it another try, unless its drawing context is gone for good
const gaveUp = new Set()
const dead = new Set()

//apply settings now, for previews and after saving
export const configure = (id, values) => {
  if (values.animated && !settings[id].animated && !dead.has(id)) gaveUp.delete(id)
  settings = { ...settings, [id]: values }
  instances[id]?.configure(values)
  refresh(id)
}

//the least time between frames, for the wallpaper's frame rate; 0 draws every frame the screen gives
//a little under the frame's length, so a 60 a second cap on a 60 hz screen skips none
let gap = 0
export const setFrameCap = (fps) => {
  gap = fps ? 1000 / fps - 3 : 0
}

export const startBackgrounds = () => {
  startGlitches()
  const root = document.documentElement
  //one canvas for the 2d backgrounds, and one made when a webgl background first shows
  const makeCanvas = () => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none'
    document.body.prepend(canvas)
    return canvas
  }
  const flat = makeCanvas()
  const surfaces = { flat: { canvas: flat, context: flat.getContext('2d') }, gl: null }
  //the canvas and context a background draws on; throws where the browser has no webgl2
  const surfaceOf = (id) => {
    if (!backgrounds[id].gl) return surfaces.flat
    if (!surfaces.gl) {
      const canvas = makeCanvas()
      const options = { alpha: false, antialias: false, powerPreference: 'low-power' }
      const context = canvas.getContext('webgl2', options)
      if (!context) {
        canvas.remove()
        throw new Error('no webgl2')
      }
      surfaces.gl = { canvas, context }
    }
    return surfaces.gl
  }
  const show = (id) => {
    for (const surface of [surfaces.flat, surfaces.gl]) {
      if (surface) surface.canvas.style.display = 'none'
    }
    if (id && instances[id]) surfaceOf(id).canvas.style.display = 'block'
  }

  let active = null
  //animated, still or wallpaper
  let mode = null
  let frame = null

  let drawn = 0
  const loop = (now) => {
    frame = requestAnimationFrame(loop)
    if (gap && now - drawn < gap) return
    drawn = now
    instances[active].frame(now)
  }

  const settle = (now) => {
    if (!instances[active].still(now)) frame = requestAnimationFrame(settle)
  }

  //draw at the display's pixels, as far as the background allows
  const resize = () => {
    const { ratio, filter } = backgrounds[active]
    const pixels = window.devicePixelRatio || 1
    const scale = ratio(pixels, settings[active])
    const { canvas } = surfaceOf(active)
    canvas.width = Math.round(innerWidth * scale)
    canvas.height = Math.round(innerHeight * scale)
    canvas.style.filter = filter ? filter(pixels) : 'none'
    instances[active].resize(canvas.width, canvas.height, scale)
  }

  const start = () => {
    cancelAnimationFrame(frame)
    //still loading: it starts once it arrives
    if (mode === 'wallpaper' || !instances[active]) return
    resize()
    if (!root.dataset.boss) frame = requestAnimationFrame(mode === 'animated' ? loop : settle)
  }

  //nothing is drawn under the boss screen
  const cover = () => {
    cancelAnimationFrame(frame)
    if (root.dataset.boss || !instances[active] || mode === 'wallpaper') return
    frame = requestAnimationFrame(mode === 'animated' ? loop : settle)
  }

  //zoom or a new screen can change the pixel ratio without a resize
  const watchPixels = () => {
    matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener(
      'change',
      () => {
        if (active) start()
        watchPixels()
      },
      { once: true },
    )
  }

  const update = (changed) => {
    const id = backgroundFor(root.dataset.theme)
    const still = backgrounds[id]?.wallpaper ? 'wallpaper' : 'still'
    const next = id && (settings[id].animated && !gaveUp.has(id) ? 'animated' : still)
    //the css shows a theme's wallpaper unless the canvas covers it
    if (next) root.dataset.background = next
    else delete root.dataset.background
    if (id === active && next === mode && changed !== id) return
    cancelAnimationFrame(frame)
    active = id
    mode = next
    show(id && mode !== 'wallpaper' ? id : null)
    //a wallpaper is the theme's css, nothing to load
    if (!id || mode === 'wallpaper') return
    if (instances[id]) return start()
    //the theme's own wallpaper stays: offline before it was ever shown, no webgl, or a
    //background that found the device too slow for it
    const giveUp = (forGood) => {
      gaveUp.add(id)
      if (forGood === true) dead.add(id)
      if (active !== id) return
      cancelAnimationFrame(frame)
      mode = 'wallpaper'
      show(null)
      root.dataset.background = 'wallpaper'
    }
    loaders[id]()
      .then((loaded) => {
        instances[id] ??= loaded.default.create(surfaceOf(id).context, settings[id], { giveUp })
        if (active !== id) return
        show(id)
        start()
      })
      .catch(giveUp)
  }

  refresh = update
  new MutationObserver(() => update()).observe(root, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  new MutationObserver(cover).observe(root, { attributes: true, attributeFilter: ['data-boss'] })
  window.addEventListener('resize', () => active && start())
  watchPixels()
  update()
}
