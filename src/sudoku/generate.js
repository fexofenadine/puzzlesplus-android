import { random, shuffled } from '../shell/random'
import { EMPTY, emptyBoard } from './rules'
import { countSolutions, solve } from './solver'
import { levels, rate } from './techniques'

export { random, shuffled }

//the fewest givens each level keeps out of 81, scaled for other sizes, so easy boards stay
//generous even where the singles alone could finish a sparser one
const fewest = [36, 30, 25, 20]
export const minGivens = (n, level) => Math.round((fewest[level] / 81) * n * n)

//a random full grid, starting over when the search wanders too long
export const makeSolution = (n, rng) => {
  for (;;) {
    const board = solve(emptyBoard(n), n, (list) => shuffled(list, rng), 50 * n)
    if (board) return board
  }
}

//takes clues away in pairs turned half way round the centre, the usual look, while keep holds
//and at least least givens stay
export const makePuzzle = (n, rng, keep, least = 0) => {
  const solution = makeSolution(n, rng)
  const givens = solution.slice()
  let count = n * n
  const last = n * n - 1
  for (const i of shuffled([...givens.keys()], rng)) {
    if (i > last - i || givens[i] === EMPTY) continue
    const pair = i === last - i ? [i] : [i, last - i]
    if (count - pair.length < least) continue
    for (const c of pair) givens[c] = EMPTY
    if (keep(givens)) count -= pair.length
    else for (const c of pair) givens[c] = solution[c]
  }
  return { givens, solution }
}

//a puzzle the techniques up to level can finish and that needs that level, within a time budget
//falls back to the hardest board found when time runs out
//the top level's what-if finishes nearly any board with one solution, so there the quick count
//stands in while clues come away, and the rating comes once at the end
export const makeGame = (n, level, rng, budget = 1500) => {
  const start = performance.now()
  const top = level === levels.length - 1
  const keep = top
    ? (board) => countSolutions(board, n, 2) === 1
    : (board) => rate(board, n, level) !== null
  let best = null
  do {
    const puzzle = makePuzzle(n, rng, keep, minGivens(n, level))
    const rated = rate(puzzle.givens, n, level)?.level
    if (rated === undefined) continue
    if (rated === level) return { ...puzzle, level }
    if (!best || rated > best.level) best = { ...puzzle, level: rated }
  } while (performance.now() - start < budget)
  return best
}
