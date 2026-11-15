import {
  EMPTY,
  all,
  bit,
  candidatesOf,
  capital,
  cellName,
  countBits,
  digitsOf,
  full,
  geometry,
  onlyDigit,
  pairsOf,
} from './rules'
import { masksOf, tighten } from './solver'

//the reasoning a person uses, easiest first, behind hints, difficulty and generation
//a step is { technique, level, place: [[cell, digit]], remove: [[cell, mask]], sources, text }
//cands are the candidates of the empty cells as masks, 0 for a placed cell
//text is only worked out when asked for, grading a board never reads it

export const levels = ['easy', 'medium', 'hard', 'expert']

const step = (technique, level, { place = [], remove = [], sources = [] }, say) => ({
  technique,
  level,
  place,
  remove,
  sources,
  get text() {
    return say()
  },
})

const lowest = (mask) => 31 - Math.clz32(mask & -mask) + 1
const highest = (mask) => 31 - Math.clz32(mask) + 1

//1, 2 or 3
const orList = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`

const unique = (list) => [...new Set(list.filter((x) => x !== undefined))]

//the cell holding digit d that rules it out of cell i, for showing why
const blocker = (board, n, i, d) => geometry(n).peers[i].find((p) => board[p] === d)

//a cell with one candidate left holds it
export const nakedSingles = (puzzle, board, cands) => {
  const { n } = puzzle
  const steps = []
  for (let i = 0; i < board.length; i++) {
    const mask = cands[i]
    if (board[i] !== EMPTY || !mask || mask & (mask - 1)) continue
    const d = onlyDigit(mask)
    const others = digitsOf(all(n) & ~mask)
    const sources = unique(others.map((o) => blocker(board, n, i, o)))
    steps.push(
      step('naked-single', 0, { place: [[i, d]], sources }, () =>
        sources.length === others.length
          ? `Every other digit is already in this cell's row or column, so it must be ${d}.`
          : `Only ${d} is left as a candidate for this cell, so it must be ${d}.`,
      ),
    )
  }
  return steps
}

//a digit with one place left in a row or column goes there
export const hiddenSingles = (puzzle, board, cands) => {
  const { n } = puzzle
  const steps = []
  const seen = new Set()
  for (const unit of geometry(n).units) {
    for (let d = 1; d <= n; d++) {
      if (unit.cells.some((i) => board[i] === d)) continue
      const spots = unit.cells.filter((i) => board[i] === EMPTY && cands[i] & bit(d))
      if (spots.length !== 1 || seen.has(spots[0])) continue
      const [i] = spots
      seen.add(i)
      const others = unit.cells.filter((c) => c !== i && board[c] === EMPTY)
      steps.push(
        step(
          'hidden-single',
          0,
          { place: [[i, d]], sources: unique(others.map((c) => blocker(board, n, c, d))) },
          () => `${d} can only go in one cell of ${unit.name}, so it goes here.`,
        ),
      )
    }
  }
  return steps
}

//how many cells stand in a chain of signs below each cell, and above it
const chains = (puzzle) => {
  const { n } = puzzle
  const pairs = pairsOf(puzzle)
  const depth = (from, to) => {
    const memo = new Int8Array(n * n).fill(-1)
    const walk = (i) => {
      if (memo[i] >= 0) return memo[i]
      memo[i] = 0
      let best = 0
      for (const pair of pairs) if (pair[from] === i) best = Math.max(best, walk(pair[to]) + 1)
      memo[i] = best
      return best
    }
    return Array.from({ length: n * n }, (_, i) => walk(i))
  }
  return { below: depth(1, 0), above: depth(0, 1) }
}

//a cell at the top of a chain of signs can't be small, one at the bottom can't be large
export const ends = (puzzle, board, cands) => {
  const { n } = puzzle
  const { below, above } = chains(puzzle)
  const steps = []
  for (let i = 0; i < n * n; i++) {
    if (board[i] !== EMPTY || (!below[i] && !above[i])) continue
    const keep = all(n) & ~((1 << below[i]) - 1) & ((1 << (n - above[i])) - 1)
    const gone = cands[i] & ~keep
    if (!gone) continue
    steps.push(
      step('ends', 0, { remove: [[i, gone]] }, () => {
        const parts = []
        if (below[i]) {
          parts.push(
            `greater than ${below[i] === 1 ? 'another cell' : `a chain of ${below[i]} cells`}, so it is at least ${below[i] + 1}`,
          )
        }
        if (above[i]) {
          parts.push(
            `less than ${above[i] === 1 ? 'another cell' : `a chain of ${above[i]} cells`}, so it is at most ${n - above[i]}`,
          )
        }
        return `The cell at ${cellName(i, n)} is ${parts.join(', and ')}.`
      }),
    )
  }
  return steps
}

//a cell beside a placed digit, with a sign between them, is kept above or below that digit
export const beside = (puzzle, board, cands) => {
  const { n } = puzzle
  const steps = []
  for (const [small, big] of pairsOf(puzzle)) {
    if (board[big] !== EMPTY && board[small] === EMPTY) {
      const gone = cands[small] & ~((1 << (board[big] - 1)) - 1)
      if (gone) {
        steps.push(
          step('beside', 0, { remove: [[small, gone]], sources: [big] }, () => {
            const left = digitsOf(cands[small] & ~gone)
            return `The cell at ${cellName(small, n)} is less than the ${board[big]} beside it, so it can only be ${orList(left)}.`
          }),
        )
      }
    }
    if (board[small] !== EMPTY && board[big] === EMPTY) {
      const gone = cands[big] & ((1 << board[small]) - 1)
      if (gone) {
        steps.push(
          step('beside', 0, { remove: [[big, gone]], sources: [small] }, () => {
            const left = digitsOf(cands[big] & ~gone)
            return `The cell at ${cellName(big, n)} is greater than the ${board[small]} beside it, so it can only be ${orList(left)}.`
          }),
        )
      }
    }
  }
  return steps
}

//two empty cells with a sign between them: the small one stays below the big one's largest
//candidate, the big one above the small one's smallest
export const limits = (puzzle, board, cands) => {
  const { n } = puzzle
  const steps = []
  for (const [small, big] of pairsOf(puzzle)) {
    if (board[small] !== EMPTY || board[big] !== EMPTY || !cands[small] || !cands[big]) continue
    const top = highest(cands[big])
    const goneSmall = cands[small] & ~((1 << (top - 1)) - 1)
    if (goneSmall) {
      steps.push(
        step(
          'limits',
          1,
          { remove: [[small, goneSmall]], sources: [big] },
          () =>
            `The cell at ${cellName(big, n)} is at most ${top}, and the cell at ${cellName(small, n)} is less than it, so it is at most ${top - 1}.`,
        ),
      )
    }
    const bottom = lowest(cands[small])
    const goneBig = cands[big] & ((1 << bottom) - 1)
    if (goneBig) {
      steps.push(
        step(
          'limits',
          1,
          { remove: [[big, goneBig]], sources: [small] },
          () =>
            `The cell at ${cellName(small, n)} is at least ${bottom}, and the cell at ${cellName(big, n)} is greater than it, so it is at least ${bottom + 1}.`,
        ),
      )
    }
  }
  return steps
}

//two cells of a line that share the same two candidates keep those digits from the rest of it
export const nakedPairs = (puzzle, board, cands) => {
  const steps = []
  for (const unit of geometry(puzzle.n).units) {
    const open = unit.cells.filter((i) => board[i] === EMPTY)
    for (let a = 0; a < open.length; a++) {
      for (let b = a + 1; b < open.length; b++) {
        const mask = cands[open[a]]
        if (countBits(mask) !== 2 || cands[open[b]] !== mask) continue
        const remove = open
          .filter((i) => i !== open[a] && i !== open[b] && cands[i] & mask)
          .map((i) => [i, cands[i] & mask])
        if (!remove.length) continue
        const [x, y] = digitsOf(mask)
        steps.push(
          step(
            'naked-pair',
            2,
            { remove, sources: [open[a], open[b]] },
            () =>
              `Two cells of ${unit.name} can only be ${x} or ${y}, so between them they take both, and no other cell of ${unit.name} can be ${x} or ${y}.`,
          ),
        )
      }
    }
  }
  return steps
}

//two digits with the same two places left in a line fill those places, so nothing else goes there
export const hiddenPairs = (puzzle, board, cands) => {
  const { n } = puzzle
  const steps = []
  for (const unit of geometry(n).units) {
    const spots = (d) => unit.cells.filter((i) => board[i] === EMPTY && cands[i] & bit(d))
    for (let x = 1; x <= n; x++) {
      const first = spots(x)
      if (first.length !== 2) continue
      for (let y = x + 1; y <= n; y++) {
        const second = spots(y)
        if (second.length !== 2 || second[0] !== first[0] || second[1] !== first[1]) continue
        const mask = bit(x) | bit(y)
        const remove = first.filter((i) => cands[i] & ~mask).map((i) => [i, cands[i] & ~mask])
        if (!remove.length) continue
        steps.push(
          step(
            'hidden-pair',
            2,
            { remove, sources: first },
            () =>
              `In ${unit.name}, ${x} and ${y} can only go in these two cells, so the two cells hold nothing else.`,
          ),
        )
      }
    }
  }
  return steps
}

//what if: a candidate that leads the simpler rules to a dead end can't be the cell's digit
//cells with the fewest candidates are tried first
export const whatIf = (puzzle, board, cands) => {
  const { n } = puzzle
  const open = [...board.keys()]
    .filter((i) => board[i] === EMPTY && countBits(cands[i]) > 1)
    .sort((a, b) => countBits(cands[a]) - countBits(cands[b]))
  const base = masksOf(board, n)
  for (const i of open) base[i] = cands[i]
  for (const i of open) {
    for (const d of digitsOf(cands[i])) {
      const trial = base.slice()
      trial[i] = bit(d)
      if (tighten(trial, puzzle)) continue
      return [
        step(
          'what-if',
          3,
          { remove: [[i, bit(d)]], sources: [i] },
          () =>
            `If the cell at ${cellName(i, n)} were ${d}, the simpler rules would soon leave a cell with no digit or a line with no place for one, so it isn't ${d}.`,
        ),
      ]
    }
  }
  return []
}

const techniques = [
  [nakedSingles, hiddenSingles, beside, ends],
  [limits],
  [nakedPairs, hiddenPairs],
  [whatIf],
]

//an empty cell with no candidate left: the board or the notes have gone wrong
const dead = (board, cands) => board.some((v, i) => v === EMPTY && !cands[i])

//the easiest steps available, or a contradiction, using techniques up to a level
export const nextSteps = (puzzle, board, cands, top = levels.length - 1) => {
  if (dead(board, cands)) return { contradiction: true, steps: [] }
  for (let level = 0; level <= top; level++) {
    for (const technique of techniques[level]) {
      const steps = technique(puzzle, board, cands)
      if (steps.length) return { level, steps }
    }
  }
  return { steps: [] }
}

//puts steps on a board and its candidates in place, false when two steps disagree
export const apply = (puzzle, board, cands, steps) => {
  const { peers } = geometry(puzzle.n)
  for (const { place, remove } of steps) {
    for (const [i, d] of place) {
      if (board[i] !== EMPTY && board[i] !== d) return false
      if (board[i] === d) continue
      if (!(cands[i] & bit(d))) return false
      board[i] = d
      cands[i] = 0
      for (const p of peers[i]) cands[p] &= ~bit(d)
    }
    for (const [i, mask] of remove) cands[i] &= ~mask
  }
  return !dead(board, cands)
}

//the hardest level a puzzle needs and its solution, or null when techniques up to top can't
//finish it; the steps are sound, so finishing proves the solution is the only one
export const rate = (puzzle, top = levels.length - 1) => {
  const board = puzzle.givens.slice()
  const cands = candidatesOf(board, puzzle.n)
  let hardest = 0
  while (!full(board)) {
    const { contradiction, level, steps } = nextSteps(puzzle, board, cands, top)
    if (contradiction || !steps.length) return null
    hardest = Math.max(hardest, level)
    if (!apply(puzzle, board, cands, steps)) return null
  }
  return { level: hardest, solution: board }
}

export { capital }
