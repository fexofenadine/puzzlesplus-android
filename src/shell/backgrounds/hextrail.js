/* hextrail, Copyright (c) 2022 Jamie Zawinski <jwz@jwz.org>
 *
 * Permission to use, copy, modify, distribute, and sell this software and its
 * documentation for any purpose is hereby granted without fee, provided that
 * the above copyright notice appear in all copies and that both that
 * copyright notice and this permission notice appear in supporting
 * documentation.  No representations are made about the suitability of this
 * software for any purpose.  It is provided "as is" without express or
 * implied warranty.
 */

import { hextrail as meta } from './meta'

//canvas port of hextrail.c: make_plane, add_arms, tick_hexagons and draw_hexagons, seen flat
//from above without the original's spin and wander, in terafox's sea colours

const EMPTY = 0
const IN = 1
const WAIT = 2
const OUT = 3
const DONE = 4

const FIRST = 0
const DRAW = 1
const FADE = 2

const H = Math.sqrt(3) / 2
//the corners of a hexagon, point up, clockwise from the top
const corners = [
  [0, -1],
  [H, -0.5],
  [H, 0.5],
  [0, 1],
  [-H, 0.5],
  [-H, -0.5],
]

//neighbours by arm: the column shift on even rows, on odd rows, and the row shift
const shifts = [
  [0, 1, -1],
  [1, 1, 0],
  [0, 1, 1],
  [-1, 0, 1],
  [-1, -1, 0],
  [-1, 0, -1],
]

//eight colours a network drifts through, in place of the original's random smooth colormap
const palettes = {
  sea: ['#2bb3b1', '#35b58f', '#3aa66c', '#2f9fa8', '#3585c4', '#3a63c8', '#4a4fc4', '#7a4fc0'],
  teal: ['#a1cdd8', '#7aa4a1', '#5a93aa', '#4fb3a5', '#3f9e9a', '#5a93aa', '#7aa4a1', '#a1cdd8'],
  ember: ['#fda47f', '#ff8349', '#e85c51', '#cb7985', '#ad5c7c', '#cb7985', '#e85c51', '#ff8349'],
}

const GROUND = [15, 28, 30]

const rgb = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))

//the plane of hexagons with their neighbours, each with six empty arms
const makePlane = (gridW, gridH, colours, rng) => {
  const hexagons = Array.from({ length: gridW * gridH }, (_, i) => ({
    x: i % gridW,
    y: Math.floor(i / gridW),
    neighbors: new Array(6).fill(null),
    arms: Array.from({ length: 6 }, () => ({ state: EMPTY, ratio: 0, speed: 0 })),
    ccolor: Math.floor(rng() * colours),
    borderState: EMPTY,
    borderRatio: 0,
  }))
  for (const h0 of hexagons) {
    shifts.forEach(([even, odd, down], arm) => {
      const x1 = h0.x + (h0.y & 1 ? odd : even)
      const y1 = h0.y + down
      if (x1 >= 0 && x1 < gridW && y1 >= 0 && y1 < gridH)
        h0.neighbors[arm] = hexagons[y1 * gridW + x1]
    })
  }
  return hexagons
}

const emptyHexagon = (h) => h.arms.every((arm) => arm.state === EMPTY)

//the network's state and the original's two steps on it: plane.live counts the growing arms
export const network = (gridW, gridH, colours, rng) => {
  const plane = {
    hexagons: makePlane(gridW, gridH, colours, rng),
    live: 0,
    state: FIRST,
    fade: 1,
  }

  //one to five arms out of a hexagon into empty neighbours, in a random order
  const addArms = (h0, out, speed) => {
    let added = 0
    let target = 1 + Math.floor(rng() * 4)
    const order = [0, 1, 2, 3, 4, 5]
    for (let i = 0; i < 6; i++) {
      const j = Math.floor(rng() * 6)
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    if (out) target--
    for (const j of order) {
      const h1 = h0.neighbors[j]
      const a0 = h0.arms[j]
      if (!h1 || !emptyHexagon(h1) || a0.state !== EMPTY) continue
      //the opposite arm waits for this one to reach the edge
      const a1 = h1.arms[(j + 3) % 6]
      a0.state = out ? OUT : IN
      a1.state = WAIT
      a0.ratio = 0
      a1.ratio = 0
      a0.speed = 0.05 * speed * (0.8 + rng())
      a1.speed = a0.speed
      if (h1.borderState === EMPTY) {
        h1.borderState = IN
        //mostly keep the same colour
        h1.ccolor = h0.ccolor
        if (!Math.floor(rng() * 5)) h1.ccolor = (h0.ccolor + 1) % colours
      }
      plane.live++
      added++
      if (added >= target) break
    }
    return added
  }

  //tick_hexagons: arms grow, pass the baton at an edge and branch at a centre; when none are
  //left growing a new cell starts, and when none can the network fades and begins again
  const tick = (speed) => {
    const { hexagons } = plane
    for (const h0 of hexagons) {
      for (let j = 0; j < 6; j++) {
        const a0 = h0.arms[j]
        if (a0.state === OUT) {
          a0.ratio += a0.speed
          if (a0.ratio > 1) {
            const a1 = h0.neighbors[j].arms[(j + 3) % 6]
            a0.state = DONE
            a0.ratio = 1
            a1.state = IN
            a1.ratio = 0
            a1.speed = a0.speed
          }
        } else if (a0.state === IN) {
          a0.ratio += a0.speed
          if (a0.ratio > 1) {
            a0.state = DONE
            a0.ratio = 1
            plane.live--
            addArms(h0, true, speed)
          }
        }
      }
      if (h0.borderState === IN) {
        h0.borderRatio += 0.05 * speed
        if (h0.borderRatio >= 1) {
          h0.borderRatio = 1
          h0.borderState = WAIT
        }
      } else if (h0.borderState === OUT) {
        h0.borderRatio -= 0.05 * speed
        if (h0.borderRatio <= 0) {
          h0.borderRatio = 0
          h0.borderState = EMPTY
        }
      } else if (h0.borderState === WAIT) {
        if (!Math.floor(rng() * 50)) h0.borderState = OUT
      }
    }
    if (plane.live <= 0) {
      for (let i = 0; i < hexagons.length / 3; i++) {
        let x
        let y
        if (plane.state === FIRST) {
          x = Math.floor(gridW / 2)
          y = Math.floor(gridH / 2)
          plane.state = DRAW
          plane.fade = 1
        } else {
          x = Math.floor(rng() * gridW)
          y = Math.floor(rng() * gridH)
        }
        const h0 = hexagons[y * gridW + x]
        if (emptyHexagon(h0) && addArms(h0, true, speed)) break
      }
    }
    if (plane.live <= 0 && plane.state !== FADE) {
      plane.state = FADE
      plane.fade = 1
      for (const h of hexagons) {
        if (h.borderState === IN || h.borderState === WAIT) h.borderState = OUT
      }
    } else if (plane.state === FADE) {
      plane.fade -= 0.01 * speed
      if (plane.fade <= 0) {
        plane.hexagons = makePlane(gridW, gridH, colours, rng)
        plane.live = 0
        plane.state = FIRST
        plane.fade = 1
      }
    }
  }

  return { plane, tick }
}

export { DONE, EMPTY, FADE, OUT }

export default {
  ...meta,
  create: (context, settings) => {
    let options = settings
    let width = 0
    let height = 0
    let pixels = 1
    //a hexagon's radius, the grid's size and the network on it
    let size = 30
    let gridW = 0
    let gridH = 0
    let net = null
    let colours = []
    let last = 0
    let owed = 0

    const ground = `rgb(${GROUND.join(' ')})`

    const build = () => {
      size = options.size * pixels
      //rows sit a radius and a half apart, columns the width of a hexagon
      gridW = Math.ceil(width / (2 * H * size)) + 2
      gridH = Math.ceil(height / (1.5 * size)) + 2
      colours = palettes[options.palette].map(rgb)
      net = network(gridW, gridH, colours.length, Math.random)
      owed = 0
    }

    const centre = (h) => [
      (h.x + (h.y & 1 ? 0.5 : 0) - 0.5) * 2 * H * size,
      (h.y - 0.5) * 1.5 * size,
    ]

    //a colour faded by the network's fade, the strength option and a ratio of its own
    const shade = (colour, ratio = 1) => {
      const k = net.plane.fade * (options.opacity / 100) * ratio
      const mixed = colour.map((v, c) => Math.round(GROUND[c] + (v - GROUND[c]) * k))
      return `rgb(${mixed.join(' ')})`
    }

    //draw_hexagons: borders, the arms as lines from the centre to an edge shaded toward the
    //neighbour's colour, and a small hexagon at the centre to cover where they meet
    const draw = () => {
      context.globalAlpha = 1
      context.fillStyle = ground
      context.fillRect(0, 0, width, height)
      const thick = options.thickness / 100
      const thick2 = thick * net.plane.fade
      const margin = thick * 0.4
      const size1 = size * (1 - margin * 2)
      const size2 = size * (1 - margin * 3)
      context.lineCap = 'butt'
      for (const h of net.plane.hexagons) {
        const [cx, cy] = centre(h)
        const colour = colours[h.ccolor]
        let total = 0
        for (const arm of h.arms) if (arm.state === OUT || arm.state === DONE) total++
        if (options.borders && h.borderState !== EMPTY) {
          context.strokeStyle = shade(colour, h.borderRatio)
          context.lineWidth = size1 - size2
          context.beginPath()
          const middle = (size1 + size2) / 2
          corners.forEach(([x, y], k) => {
            if (k) context.lineTo(cx + x * middle, cy + y * middle)
            else context.moveTo(cx + x * middle, cy + y * middle)
          })
          context.closePath()
          context.stroke()
        }
        for (let j = 0; j < 6; j++) {
          const arm = h.arms[j]
          if (arm.state !== IN && arm.state !== OUT && arm.state !== DONE) continue
          const k = (j + 1) % 6
          //toward the middle of the edge between two corners, as far as the edge at H
          const x = (corners[j][0] + corners[k][0]) / 2
          const y = (corners[j][1] + corners[k][1]) / 2
          const near = colours[h.neighbors[j].ccolor].map((v, c) => (v + colour[c]) / 2)
          const [start, end, from, to] =
            arm.state === OUT
              ? [0, size * arm.ratio, colour, near]
              : [size, size * (1 - arm.ratio), near, colour]
          const x0 = cx + x * start
          const y0 = cy + y * start
          const x1 = cx + x * end
          const y1 = cy + y * end
          if (x0 === x1 && y0 === y1) continue
          const line = context.createLinearGradient(x0, y0, x1, y1)
          line.addColorStop(0, shade(from))
          line.addColorStop(1, shade(to))
          context.strokeStyle = line
          context.lineWidth = Math.max(1, 2 * size2 * thick2)
          context.beginPath()
          context.moveTo(x0, y0)
          context.lineTo(x1, y1)
          context.stroke()
        }
        if (total) {
          //twice the size where a line ends, the dots of the original
          const size3 = size * thick2 * 0.8 * (total === 1 ? 2 : 1) * 1.2
          context.fillStyle = shade(colour)
          context.beginPath()
          corners.forEach(([x, y], k) => {
            if (k) context.lineTo(cx + x * size3, cy + y * size3)
            else context.moveTo(cx + x * size3, cy + y * size3)
          })
          context.closePath()
          context.fill()
        }
      }
    }

    return {
      configure: (next) => {
        const rebuild = next.size !== options.size || next.palette !== options.palette
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
        //the original ticks every 30 ms
        const passed = Math.min(250, now - last)
        last = now
        owed = Math.min(4, owed + passed / 30)
        if (owed < 1) return
        for (; owed >= 1; owed--) net.tick(options.speed)
        draw()
      },
      //a whole network at once: ticked unseen until it would begin to fade
      still: () => {
        for (let guard = 0; guard < 200000 && net.plane.state !== FADE; guard++) net.tick(4)
        net.plane.fade = 1
        draw()
        return true
      },
    }
  },
}
