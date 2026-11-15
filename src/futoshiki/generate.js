import { random, shuffled } from '../shell/random'
import { LESS, MORE, NONE } from './rules'
import { countSolutions } from './solver'
import { levels, rate } from './techniques'

export { random, shuffled }

//a random latin square: a cyclic one with its rows, columns and digits shuffled
export const makeSolution = (n, rng) => {
  const order = [...Array(n).keys()]
  const rows = shuffled(order, rng)
  const cols = shuffled(order, rng)
  const digits = shuffled(order, rng)
  return Int8Array.from({ length: n * n }, (_, i) => {
    const r = rows[Math.floor(i / n)]
    const c = cols[i % n]
    return digits[(r + c) % n] + 1
  })
}

//every sign a solution allows: one between each pair of neighbours
const allSigns = (solution, n) => {
  const right = new Int8Array(n * n)
  const down = new Int8Array(n * n)
  for (let i = 0; i < n * n; i++) {
    if (i % n < n - 1) right[i] = solution[i] < solution[i + 1] ? LESS : MORE
    if (i + n < n * n) down[i] = solution[i] < solution[i + n] ? LESS : MORE
  }
  return { right, down }
}

//a full board with every sign, then digits and signs taken away in one random order, each
//for as long as keep holds, so what is left is a mix of both
export const makePuzzle = (n, rng, keep) => {
  const solution = makeSolution(n, rng)
  let puzzle = { n, givens: solution.slice(), ...allSigns(solution, n) }
  const clues = [...solution.keys()].flatMap((i) => [
    ['givens', i],
    ['right', i],
    ['down', i],
  ])
  for (const [part, i] of shuffled(clues, rng)) {
    if (puzzle[part][i] === NONE) continue
    const less = puzzle[part].slice()
    less[i] = NONE
    const trial = { ...puzzle, [part]: less }
    if (keep(trial)) puzzle = trial
  }
  return { ...puzzle, solution }
}

//a puzzle that needs exactly level within a time budget, else the hardest found below it
//expert only keeps the solution single while clues go, what-if finishes nearly any such board
export const makeGame = (n, level, rng, budget = 1500) => {
  const start = performance.now()
  const top = levels.length - 1
  const keep =
    level === top
      ? (puzzle) => countSolutions(puzzle, 2) === 1
      : (puzzle) => rate(puzzle, level) !== null
  let best = null
  do {
    const puzzle = makePuzzle(n, rng, keep)
    const rated = rate(puzzle, level)
    if (!rated) continue
    if (rated.level === level) return { ...puzzle, level }
    if (!best || rated.level > best.level) best = { ...puzzle, level: rated.level }
  } while (!best || performance.now() - start < budget)
  return best
}
