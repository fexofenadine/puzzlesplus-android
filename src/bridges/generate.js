import { random, shuffled } from '../shell/random'
import { linksOf } from './rules'
import { countSolutions } from './solver'
import { levels, rate } from './techniques'

export { random, shuffled }

const steps = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

//islands grown from one by bridges, then more bridges between neighbours: returns the islands
//(each numbered by its bridges) and the solution as the bridges on each link
//the fewer bridges beyond the tree, the more the puzzle leaves open
export const makeIslands = (n, rng) => {
  const cell = (x, y) => (x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x)
  const isle = new Uint8Array(n * n)
  const water = new Uint8Array(n * n)
  const placed = []
  const joins = []
  const first = cell(Math.floor(rng() * n), Math.floor(rng() * n))
  isle[first] = 1
  placed.push(first)
  const target = Math.round(n * n * (0.2 + rng() * 0.08))
  //an island has no island beside it, or the pair has no room for a bridge
  const lonely = (c) => {
    const x = c % n
    const y = Math.floor(c / n)
    return steps.every(([dx, dy]) => {
      const o = cell(x + dx, y + dy)
      return o < 0 || !isle[o]
    })
  }
  for (let tries = 0; placed.length < target && tries < target * 60; tries++) {
    const a = placed[Math.floor(rng() * placed.length)]
    const [dx, dy] = steps[Math.floor(rng() * 4)]
    const length = 2 + Math.floor(rng() * 4)
    const path = []
    let b = -1
    let ok = true
    for (let k = 1; k <= length && ok; k++) {
      const c = cell((a % n) + dx * k, Math.floor(a / n) + dy * k)
      if (c < 0 || isle[c] || water[c]) {
        ok = false
        break
      }
      if (k === length) b = c
      else path.push(c)
    }
    if (!ok || b < 0 || !lonely(b)) continue
    //a bridge's own water beside an island of another bridge is fine, an island in the water is not
    isle[b] = 1
    for (const c of path) water[c] = 1
    placed.push(b)
    joins.push({ a, b, count: rng() < 0.35 ? 2 : 1, path })
  }
  //extra bridges between neighbours in line, wherever the water between them is free
  const islands0 = Int8Array.from(isle)
  const { links } = linksOf(islands0, n)
  for (const link of shuffled(links, rng)) {
    const joined = joins.some(
      (j) => (j.a === link.a && j.b === link.b) || (j.a === link.b && j.b === link.a),
    )
    if (joined || rng() < 0.45 || link.cells.some((c) => water[c])) continue
    for (const c of link.cells) water[c] = 1
    joins.push({ a: link.a, b: link.b, count: rng() < 0.35 ? 2 : 1, path: link.cells })
  }
  const islands = new Int8Array(n * n)
  for (const { a, b, count } of joins) {
    islands[a] += count
    islands[b] += count
  }
  const found = linksOf(islands, n).links
  const solution = Int8Array.from(found, (link) => {
    const join = joins.find(
      (j) => (j.a === link.a && j.b === link.b) || (j.a === link.b && j.b === link.a),
    )
    return join ? join.count : 0
  })
  return { islands, solution }
}

//a puzzle that needs exactly level within a time budget, else the hardest found below it
//expert only keeps the solution single, what-if finishes nearly any such board
export const makeGame = (n, level, rng, budget = 1500) => {
  const start = performance.now()
  const top = levels.length - 1
  let best = null
  do {
    const { islands } = makeIslands(n, rng)
    if (islands.every((v) => !v) || countSolutions(islands, n, 2) !== 1) continue
    const rated = rate(islands, n, level === top ? top : level)
    if (!rated) continue
    if (rated.level === level) return { islands, solution: rated.solution, level }
    if (!best || rated.level > best.level) {
      best = { islands, solution: rated.solution, level: rated.level }
    }
  } while (!best || performance.now() - start < budget)
  return best
}
