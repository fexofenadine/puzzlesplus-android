import { random, shuffled } from '../shell/random'
import { EMPTY, emptyBoard } from './rules'
import { countSolutions, solve } from './solver'
import { rate } from './techniques'

export { random, shuffled }

//a random full board that keeps every rule
//now and then a random search walks into a dead end that takes minutes, so it starts over instead
export const makeSolution = (n, rng) => {
  for (;;) {
    const board = solve(emptyBoard(n), n, (list) => shuffled(list, rng), 4 * n)
    if (board) return board
  }
}

//takes clues away in random order while the board keeps exactly one solution
//keep says whether a board is still acceptable, difficulty rating plugs in here later
export const makePuzzle = (n, rng, keep = (board) => countSolutions(board, n, 2) === 1) => {
  const solution = makeSolution(n, rng)
  const givens = solution.slice()
  for (const i of shuffled([...givens.keys()], rng)) {
    givens[i] = EMPTY
    if (!keep(givens)) givens[i] = solution[i]
  }
  return { givens, solution }
}

//a puzzle that needs exactly level within a time budget, else the hardest found
//finishing by sound steps proves the solution is the only one
export const makeGame = (n, level, rng, budget = 1500) => {
  const start = performance.now()
  const keep = (board) => rate(board, n, level) !== null
  let best = null
  do {
    const puzzle = makePuzzle(n, rng, keep)
    const rated = rate(puzzle.givens, n, level).level
    if (rated === level) return { ...puzzle, level }
    if (!best || rated > best.level) best = { ...puzzle, level: rated }
  } while (performance.now() - start < budget)
  return best
}
