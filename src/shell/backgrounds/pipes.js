import { pipes as meta } from './meta'

//the pipes of windows 95, grown the way xscreensaver's pipes by marcelo f. vianna grows them
//written anew for a flat canvas: an oblique view of a lattice a few layers deep, where each new
//piece is drawn and the nearer pieces it crosses are drawn again over it, clipped to its box

const LAYERS = 5
//how far each layer back sits to the right and up, in lattice steps
const SLANT = 0.42
//the dusk behind the pipes, top and bottom
const SKY = ['#00545c', '#3b2c70']
const SHADE = [28, 16, 56]
const SHINE = [255, 255, 255]

const palettes = {
  pastel: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'],
  sunset: ['#ff71ce', '#b967ff', '#fffb96', '#ff9e7a'],
  sea: ['#01cdfe', '#05ffa1', '#7ee8fa', '#b8ffe3'],
}

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t))
const css = ([r, g, b]) => `rgb(${r} ${g} ${b})`

//the six ways a pipe can go: along x, y, or between layers
export const dirs = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

//a lattice of cols x rows x LAYERS nodes, and which are taken
export const lattice = (cols, rows) => {
  const taken = new Uint8Array(cols * rows * LAYERS)
  const at = (i, j, z) => (z * rows + j) * cols + i
  const free = (i, j, z) =>
    i >= 0 && j >= 0 && z >= 0 && i < cols && j < rows && z < LAYERS && !taken[at(i, j, z)]
  return { cols, rows, taken, at, free }
}

//a pipe's next direction: mostly straight on, else any free way, null when boxed in
export const turn = (grid, pipe, rng) => {
  const [dx, dy, dz] = dirs[pipe.dir]
  if (rng() < 0.6 && grid.free(pipe.i + dx, pipe.j + dy, pipe.z + dz)) return pipe.dir
  const open = dirs
    .map((_, k) => k)
    .filter((k) => grid.free(pipe.i + dirs[k][0], pipe.j + dirs[k][1], pipe.z + dirs[k][2]))
  return open.length ? open[Math.floor(rng() * open.length)] : null
}

export default {
  ...meta,
  create: (context, settings) => {
    let options = settings
    let width = 0
    let height = 0
    let pixels = 1
    let step = 44
    let radius = 9
    let grid = null
    //every piece drawn so far, and which pieces touch each coarse square of the screen
    let items = []
    let squares = new Map()
    let pipes = []
    let colour = 0
    let last = 0
    let owed = 0
    //frames of fading left before the next system starts, 0 while growing
    let fading = 0
    let rested = 0
    let quiet = false

    const sky = () => {
      const fill = context.createLinearGradient(0, 0, 0, height)
      fill.addColorStop(0, SKY[0])
      fill.addColorStop(1, SKY[1])
      return fill
    }

    //a node's place on screen, far layers up and to the right
    const place = (i, j, z) => [
      (i - 2 + z * SLANT) * step,
      (j - 1 + (LAYERS - 1 - z) * SLANT) * step,
    ]

    //a colour as lit, plain and shaded, dimmer the further back and the lower the strength
    const tones = (hex, z) => {
      const back = rgb(SKY[1])
      const haze = 1 - (1 - z * 0.09) * (options.opacity / 100)
      const tone = (colour) => css(mix(colour, back, haze))
      const base = rgb(hex)
      return [tone(mix(base, SHINE, 0.55)), tone(base), tone(mix(base, SHADE, 0.55))]
    }

    const drawTube = ({ ax, ay, bx, by, tones: [lit, plain, dark] }) => {
      const length = Math.hypot(bx - ax, by - ay) || 1
      //the normal on the side the light comes from, up and to the left
      let nx = -(by - ay) / length
      let ny = (bx - ax) / length
      if (nx + ny > 0) {
        nx = -nx
        ny = -ny
      }
      const fill = context.createLinearGradient(
        ax + nx * radius,
        ay + ny * radius,
        ax - nx * radius,
        ay - ny * radius,
      )
      fill.addColorStop(0, plain)
      fill.addColorStop(0.28, lit)
      fill.addColorStop(0.6, plain)
      fill.addColorStop(1, dark)
      context.fillStyle = fill
      context.beginPath()
      context.moveTo(ax + nx * radius, ay + ny * radius)
      context.lineTo(bx + nx * radius, by + ny * radius)
      context.lineTo(bx - nx * radius, by - ny * radius)
      context.lineTo(ax - nx * radius, ay - ny * radius)
      context.fill()
    }

    const drawBall = ({ ax, ay, size, tones: [lit, plain, dark] }) => {
      const fill = context.createRadialGradient(
        ax - size * 0.35,
        ay - size * 0.35,
        size * 0.1,
        ax,
        ay,
        size,
      )
      fill.addColorStop(0, lit)
      fill.addColorStop(0.5, plain)
      fill.addColorStop(1, dark)
      context.fillStyle = fill
      context.beginPath()
      context.arc(ax, ay, size, 0, Math.PI * 2)
      context.fill()
    }

    const draw = (item) => (item.ball ? drawBall(item) : drawTube(item))

    const SQUARE = () => step * 2

    const squaresOf = ({ box: [x0, y0, x1, y1] }) => {
      const size = SQUARE()
      const keys = []
      for (let y = Math.floor(y0 / size); y <= Math.floor(y1 / size); y++) {
        for (let x = Math.floor(x0 / size); x <= Math.floor(x1 / size); x++) keys.push(`${x},${y}`)
      }
      return keys
    }

    //a new piece goes under every nearer piece it crosses: those are drawn again, far to near,
    //inside the new piece's box only, so nothing beyond it changes
    const add = (item) => {
      const index = items.length
      items.push(item)
      const over = new Set()
      for (const key of squaresOf(item)) {
        let list = squares.get(key)
        if (!list) squares.set(key, (list = []))
        for (const other of list) if (items[other].depth < item.depth) over.add(other)
        list.push(index)
      }
      if (quiet) return
      draw(item)
      if (!over.size) return
      const [x0, y0, x1, y1] = item.box
      context.save()
      context.beginPath()
      context.rect(x0, y0, x1 - x0, y1 - y0)
      context.clip()
      const order = [...over].sort((a, b) => items[b].depth - items[a].depth || a - b)
      for (const other of order) draw(items[other])
      context.restore()
    }

    const tube = (from, to, hex) => {
      const [ax, ay] = place(...from)
      const [bx, by] = place(...to)
      const z = Math.min(from[2], to[2])
      add({
        ax,
        ay,
        bx,
        by,
        //a tube between layers sits between them
        depth: from[2] === to[2] ? z : z + 0.5,
        tones: tones(hex, (from[2] + to[2]) / 2),
        box: [
          Math.min(ax, bx) - radius - 1,
          Math.min(ay, by) - radius - 1,
          Math.max(ax, bx) + radius + 1,
          Math.max(ay, by) + radius + 1,
        ],
      })
    }

    //a joint sits just in front of the tubes of its own layer
    const ball = (node, hex) => {
      if (!options.joints) return
      const [ax, ay] = place(...node)
      const size = radius * 1.35
      add({
        ball: true,
        ax,
        ay,
        size,
        depth: node[2] - 0.01,
        tones: tones(hex, node[2]),
        box: [ax - size - 1, ay - size - 1, ax + size + 1, ay + size + 1],
      })
    }

    //a pipe starts at a free node, null when a few tries find none
    const spawn = () => {
      const colours = palettes[options.palette]
      for (let tries = 0; tries < 30; tries++) {
        const i = Math.floor(Math.random() * grid.cols)
        const j = Math.floor(Math.random() * grid.rows)
        const z = Math.floor(Math.random() * LAYERS)
        if (!grid.free(i, j, z)) continue
        grid.taken[grid.at(i, j, z)] = 1
        const pipe = {
          i,
          j,
          z,
          dir: Math.floor(Math.random() * dirs.length),
          hex: colours[colour++ % colours.length],
          left: 30 + Math.floor(Math.random() * 120),
        }
        ball([i, j, z], pipe.hex)
        return pipe
      }
      return null
    }

    //one piece more on a pipe, false once it ends
    const grow = (pipe) => {
      const dir = pipe.left-- > 0 ? turn(grid, pipe, Math.random) : null
      const here = [pipe.i, pipe.j, pipe.z]
      if (dir === null) {
        ball(here, pipe.hex)
        return false
      }
      const [dx, dy, dz] = dirs[dir]
      const there = [pipe.i + dx, pipe.j + dy, pipe.z + dz]
      grid.taken[grid.at(...there)] = 1
      tube(here, there, pipe.hex)
      if (dir !== pipe.dir) ball(here, pipe.hex)
      Object.assign(pipe, { i: there[0], j: there[1], z: there[2], dir })
      return true
    }

    //every pipe grows a piece, ended ones are replaced; false when the system is full
    const advance = () => {
      while (pipes.length < options.count) {
        const pipe = spawn()
        if (!pipe) break
        pipes.push(pipe)
      }
      if (!pipes.length) return false
      pipes = pipes.filter(grow)
      return items.length < options.pieces
    }

    const build = () => {
      step = Math.round(options.size * pixels)
      radius = Math.max(2, step * (options.thickness / 100))
      grid = lattice(Math.ceil(width / step) + 4, Math.ceil(height / step) + 4)
      items = []
      squares = new Map()
      pipes = []
      fading = 0
      rested = 0
      owed = 0
      context.globalAlpha = 1
      context.fillStyle = sky()
      context.fillRect(0, 0, width, height)
    }

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
          //the old system sinks into the dusk, then a new one starts
          context.globalAlpha = 0.12
          context.fillStyle = sky()
          context.fillRect(0, 0, width, height)
          context.globalAlpha = 1
          if (!--fading) build()
          return
        }
        if (rested) {
          rested -= passed
          if (rested <= 0) fading = 40
          return
        }
        owed += (passed * options.speed) / 1000
        for (; owed >= 1; owed--) {
          if (advance()) continue
          //a full system rests a while before it goes
          rested = 4000
          owed = 0
          break
        }
      },
      //a finished system at once: grown unseen, then drawn far to near
      still: () => {
        quiet = true
        let guard = options.pieces * 4
        while (advance() && guard-- > 0);
        quiet = false
        const order = items
          .map((_, k) => k)
          .sort((a, b) => items[b].depth - items[a].depth || a - b)
        for (const k of order) draw(items[k])
        return true
      },
    }
  },
}
