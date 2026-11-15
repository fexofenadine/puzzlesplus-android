import { random, shuffled } from '../shell/random'
import { BLANK, WHITE, besideOf, sightsOf } from './rules'
import { countSolutions } from './solver'
import { levels, rate } from './techniques'

export { random, shuffled }

//walls scattered over about a fifth of the board, the same when turned half round
export const makeLayout = (n, rng) => {
  const layout = new Int8Array(n * n).fill(WHITE)
  const share = 0.17 + rng() * 0.08
  for (let i = 0; i < Math.ceil((n * n) / 2); i++) {
    if (rng() >= share) continue
    layout[i] = BLANK
    layout[n * n - 1 - i] = BLANK
  }
  return layout
}

//bulbs that light every white cell without lighting each other: each dark cell in a random
//order takes one, as 1 for a bulb and 0 elsewhere
export const makeSolution = (layout, n, rng) => {
  const sights = sightsOf(layout, n)
  const bulbs = new Int8Array(n * n)
  const lit = new Uint8Array(n * n)
  for (const i of shuffled([...layout.keys()], rng)) {
    if (layout[i] !== WHITE || lit[i]) continue
    bulbs[i] = 1
    lit[i] = 1
    for (const c of sights[i]) lit[c] = 1
  }
  return bulbs
}

//every wall numbered by the bulbs beside it
const numbered = (layout, bulbs, n) => {
  const beside = besideOf(n)
  return layout.map((v, i) =>
    v === WHITE ? WHITE : beside[i].reduce((sum, c) => sum + bulbs[c], 0),
  )
}

//a layout with a solution, then numbers taken off its walls in a random order for as long as
//keep holds; null when even every number isn't enough
export const makePuzzle = (n, rng, keep) => {
  const walls = makeLayout(n, rng)
  const solution = makeSolution(walls, n, rng)
  let layout = numbered(walls, solution, n)
  if (!keep(layout)) return null
  for (const i of shuffled([...layout.keys()], rng)) {
    if (layout[i] === WHITE) continue
    const trial = layout.slice()
    trial[i] = BLANK
    if (keep(trial)) layout = trial
  }
  return { layout, solution }
}

//a puzzle that needs exactly level within a time budget, else the hardest found below it
//expert only keeps the solution single while numbers go, what-if finishes nearly any such board
export const makeGame = (n, level, rng, budget = 1500) => {
  const start = performance.now()
  const top = levels.length - 1
  const keep =
    level === top
      ? (layout) => countSolutions(layout, n, 2) === 1
      : (layout) => rate(layout, n, level) !== null
  let best = null
  do {
    const puzzle = makePuzzle(n, rng, keep)
    const rated = puzzle && rate(puzzle.layout, n, level)
    if (!rated) continue
    if (rated.level === level) return { ...puzzle, level }
    if (!best || rated.level > best.level) best = { ...puzzle, level: rated.level }
  } while (!best || performance.now() - start < budget)
  return best
}
