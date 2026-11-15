import { coral as meta } from './meta'

//coral as xscreensaver's coral by frederick roeber grows it, written anew for a canvas:
//walkers wander a grid at random and freeze where they touch a seed or the coral so far
//the grid is coarser than the screen, so a full hd page has about fifty thousand walkers

const GROUND = [35, 42, 46]

//everforest's accents, each list a loop the growth walks round once
const palettes = {
  forest: ['#a7c080', '#83c092', '#7fbbb3', '#5c8a6e', '#a7c080'],
  autumn: ['#dbbc7f', '#e69875', '#e67e80', '#d699b6', '#dbbc7f'],
  all: ['#a7c080', '#83c092', '#7fbbb3', '#d699b6', '#e67e80', '#e69875', '#dbbc7f', '#a7c080'],
}

const SHADES = 96

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))

//a smooth run of shades through a palette's colours, each faded toward the ground by strength
export const ramp = (colours, strength, count = SHADES) =>
  Array.from({ length: count }, (_, k) => {
    const at = (k / count) * (colours.length - 1)
    const a = rgb(colours[Math.floor(at)])
    const b = rgb(colours[Math.min(colours.length - 1, Math.floor(at) + 1)])
    const t = at - Math.floor(at)
    const [r, g, bl] = a.map((v, c) => {
      const colour = v + (b[c] - v) * t
      return Math.round(GROUND[c] + (colour - GROUND[c]) * strength)
    })
    return `rgb(${r} ${g} ${bl})`
  })

//the growth itself, apart from any canvas: plot(x, y, shade) is told each cell that freezes
export const reef = (cols, rows, { seeds, density }, rng, plot) => {
  const set = new Uint8Array(cols * rows)
  const total = Math.floor((cols * rows * density) / 100)
  const xs = new Int16Array(total)
  const ys = new Int16Array(total)
  let count = total
  let frozen = 0
  //the shade moves on as the coral grows, once round by the end
  const sloth = Math.max(1, Math.ceil(total / SHADES))

  const freeze = (x, y) => {
    set[y * cols + x] = 1
    plot(x, y, Math.min(SHADES - 1, Math.floor(frozen++ / sloth)))
  }

  for (let n = 0; n < seeds; n++) {
    freeze(1 + Math.floor(rng() * (cols - 2)), 1 + Math.floor(rng() * (rows - 2)))
  }
  for (let n = 0; n < total; n++) {
    xs[n] = 1 + Math.floor(rng() * (cols - 2))
    ys[n] = 1 + Math.floor(rng() * (rows - 2))
  }

  const touching = (x, y) => {
    const at = y * cols + x
    return (
      set[at - 1] ||
      set[at + 1] ||
      set[at - cols] ||
      set[at + cols] ||
      set[at - cols - 1] ||
      set[at - cols + 1] ||
      set[at + cols - 1] ||
      set[at + cols + 1]
    )
  }

  //every walker freezes where it touches coral, else takes one step; true while any are left
  const step = () => {
    for (let n = count - 1; n >= 0; n--) {
      const x = xs[n]
      const y = ys[n]
      if (set[y * cols + x] || touching(x, y)) {
        if (!set[y * cols + x]) freeze(x, y)
        count--
        xs[n] = xs[count]
        ys[n] = ys[count]
        continue
      }
      const way = Math.floor(rng() * 4)
      if (way === 0 && x > 1) xs[n] = x - 1
      else if (way === 1 && x < cols - 2) xs[n] = x + 1
      else if (way === 2 && y > 1) ys[n] = y - 1
      else if (way === 3 && y < rows - 2) ys[n] = y + 1
    }
    return count > 0
  }

  return { step, left: () => count, total }
}

export default {
  ...meta,
  create: (context, settings) => {
    let options = settings
    let width = 0
    let height = 0
    let pixels = 1
    let cell = 3
    let shades = []
    let growth = null
    let last = 0
    let owed = 0
    //milliseconds a finished reef still rests, and frames of fading left after that
    let rested = 0
    let fading = 0

    const ground = `rgb(${GROUND.join(' ')})`

    const plot = (x, y, shade) => {
      context.fillStyle = shades[shade]
      context.fillRect(x * cell, y * cell, cell, cell)
    }

    const build = () => {
      cell = Math.max(1, Math.round(options.grain * pixels))
      shades = ramp(palettes[options.palette], options.opacity / 100)
      rested = 0
      fading = 0
      owed = 0
      context.globalAlpha = 1
      context.fillStyle = ground
      context.fillRect(0, 0, width, height)
      const cols = Math.ceil(width / cell) + 2
      const rows = Math.ceil(height / cell) + 2
      growth = reef(cols, rows, options, Math.random, plot)
    }

    //the last few walkers can wander for minutes, so the reef counts as grown without them
    const grown = () => growth.left() <= growth.total * 0.02

    return {
      configure: (next) => {
        options = next
        if (width) build()
      },
      resize: (w, h, scale = 1) => {
        width = w
        height = h
        pixels = scale
        last = performance.now()
        build()
      },
      frame: (now) => {
        const passed = Math.min(250, now - last)
        last = now
        if (fading) {
          context.globalAlpha = 0.1
          context.fillStyle = ground
          context.fillRect(0, 0, width, height)
          context.globalAlpha = 1
          if (!--fading) build()
          return
        }
        if (rested) {
          rested -= passed
          if (rested <= 0) fading = 45
          return
        }
        owed = Math.min(4, owed + (passed * options.speed) / 1000)
        for (; owed >= 1; owed--) {
          if (growth.step() && !grown()) continue
          rested = options.delay * 1000
          owed = 0
          break
        }
      },
      //grows to the end in slices, then stops
      still: (now) => {
        while (!grown() && performance.now() - now < 30) growth.step()
        return grown()
      },
    }
  },
}
