import { qix as meta } from './meta'
import { tape, tapeCounter } from './tape'

export { tape }

//bouncing polygons that leave fading trails, after xscreensaver's qix and the mystify
//screensaver of windows 95; written anew for a canvas
//only the lines are drawn, the theme's wallpaper shows under them like a tape playing

//one colour a shape, in the order the wallpaper uses them (cyan sky, pink floor, lavender haze, the sun,
//the mint sphere), each deepened until it reads on the wallpaper's pale sky and floor
const colours = ['#0096d6', '#ff2e97', '#8a3ffc', '#ff9a1f', '#00a878'].map((hex) =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)),
)

//a worn tape's colour bleed: a pink ghost to the left of each line and a cyan one to the right
const GHOSTS = [
  [-1, '#ff71ce'],
  [1, '#01cdfe'],
]

//a shape of corners, each with a place and a speed in pixels a step, and its past outlines
export const makeShape = (corners, width, height, pace, rng) => ({
  points: Array.from({ length: corners }, () => ({
    x: rng() * width,
    y: rng() * height,
    dx: (rng() < 0.5 ? -1 : 1) * pace * (0.5 + rng()),
    dy: (rng() < 0.5 ? -1 : 1) * pace * (0.5 + rng()),
  })),
  trail: [],
})

//one step: every corner moves and turns back at an edge, the outline joins the trail
export const stepShape = (shape, width, height, length) => {
  for (const p of shape.points) {
    p.x += p.dx
    p.y += p.dy
    if (p.x < 0 || p.x > width) {
      p.dx = -p.dx
      p.x = Math.max(0, Math.min(width, p.x))
    }
    if (p.y < 0 || p.y > height) {
      p.dy = -p.dy
      p.y = Math.max(0, Math.min(height, p.y))
    }
  }
  shape.trail.push(shape.points.map(({ x, y }) => [x, y]))
  while (shape.trail.length > length) shape.trail.shift()
}

export default {
  ...meta,
  create: (context, settings) => {
    let options = settings
    let width = 0
    let height = 0
    let pixels = 1
    let shapes = []
    let last = 0
    let owed = 0
    const count = tapeCounter()

    const outline = (points, shift) => {
      context.beginPath()
      points.forEach(([x, y], n) =>
        n ? context.lineTo(x + shift, y) : context.moveTo(x + shift, y),
      )
      context.closePath()
      context.stroke()
    }

    const build = () => {
      shapes = Array.from({ length: options.count }, () =>
        makeShape(options.corners, width, height, 3 * pixels, Math.random),
      )
      owed = 0
    }

    const step = () => {
      for (const shape of shapes) stepShape(shape, width, height, options.trail)
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      context.lineWidth = Math.max(1, 1.5 * pixels)
      context.lineJoin = 'round'
      const bleed = options.bleed * pixels
      shapes.forEach((shape, number) => {
        const [red, green, blue] = colours[number % colours.length]
        shape.trail.forEach((points, k) => {
          //older outlines are fainter
          const alpha = ((k + 1) / shape.trail.length) * (options.opacity / 100)
          if (bleed) {
            context.globalAlpha = alpha * 0.45
            for (const [side, colour] of GHOSTS) {
              context.strokeStyle = colour
              outline(points, side * bleed)
            }
          }
          context.globalAlpha = alpha
          context.strokeStyle = `rgb(${red} ${green} ${blue})`
          outline(points, 0)
        })
      })
      context.globalAlpha = 1
    }

    return {
      configure: (next) => {
        const rebuild = next.count !== options.count || next.corners !== options.corners
        options = next
        if (width && rebuild) build()
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
        count(passed)
        owed = Math.min(4, owed + (passed * options.speed) / 30)
        if (owed < 1) return
        for (; owed >= 1; owed--) step()
        draw()
      },
    }
  },
}
