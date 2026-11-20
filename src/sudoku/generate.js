import { random, shuffled } from '../shell/random'
import { EMPTY, connected, emptyBoard } from './rules'
import { countSolutions, solve } from './solver'
import { levels, rate } from './techniques'

export { random, shuffled }

//the fewest givens each level keeps out of 81, scaled for other sizes, so easy boards stay
//generous even where the singles alone could finish a sparser one
const fewest = [36, 30, 25, 20]
export const minGivens = (n, level) => Math.round((fewest[level] / 81) * n * n)

//a jigsaw layout: the usual boxes, with a cell handed to a neighbouring region and another
//handed back, over and over, keeping every region nine connected cells
export const makeLayout = (rng, n = 9, swaps = 300) => {
  const regions = Array.from(
    { length: n * n },
    (_, i) => Math.floor(i / n / 3) * 3 + Math.floor((i % n) / 3),
  )
  const near = (i) =>
    [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1].filter(
      (j) => j >= 0 && j < n * n,
    )
  const piece = (r) => regions.flatMap((v, i) => (v === r ? [i] : []))
  const pick = (list) => list[Math.floor(rng() * list.length)]
  for (let done = 0, tries = 0; done < swaps && tries < swaps * 40; tries++) {
    const a = Math.floor(rng() * n * n)
    const x = regions[a]
    const y = regions[pick(near(a))]
    if (x === y) continue
    //c is in y, beside x, and goes back
    const back = piece(y).filter((c) => c !== a && near(c).some((j) => regions[j] === x))
    if (!back.length) continue
    const c = pick(back)
    regions[a] = y
    regions[c] = x
    if (connected(piece(x), n) && connected(piece(y), n)) done++
    else {
      regions[a] = x
      regions[c] = y
    }
  }
  return regions.join('')
}

//a random full grid, starting over when the search wanders too long; null after tries starts
export const makeSolution = (n, rng, layout, tries = Infinity) => {
  for (let k = 0; k < tries; k++) {
    const board = solve(emptyBoard(n), n, (list) => shuffled(list, rng), 50 * n, layout)
    if (board) return board
  }
  return null
}

//takes clues away in pairs turned half way round the centre, the usual look, while keep holds
//and at least least givens stay; a jigsaw board is dealt its own layout
export const makePuzzle = (n, rng, keep, least = 0, layout) => {
  const solution = makeSolution(n, rng, layout, layout ? 10 : Infinity)
  if (!solution) return null
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
  return { givens, solution, layout }
}

//a puzzle that needs exactly level within a time budget, else the hardest found
//regions deals a jigsaw board, a layout of its own for every attempt
//the top level's what-if finishes nearly anything, so a quick count stands in while clues come away
export const makeGame = (n, level, rng, budget = 1500, regions = false) => {
  const start = performance.now()
  const top = level === levels.length - 1
  let best = null
  do {
    const layout = regions ? makeLayout(rng, n) : undefined
    const keep = top
      ? (board) => countSolutions(board, n, 2, layout) === 1
      : (board) => rate(board, n, level, layout) !== null
    const puzzle = makePuzzle(n, rng, keep, minGivens(n, level), layout)
    if (!puzzle) continue
    const rated = rate(puzzle.givens, n, level, layout)?.level
    if (rated === undefined) continue
    if (rated === level) return { ...puzzle, level }
    if (!best || rated > best.level) best = { ...puzzle, level: rated }
  } while (performance.now() - start < budget)
  return best
}
