import { expect, it } from 'vitest'
import {
  EMPTY,
  bit,
  breaks,
  candidatesOf,
  digitsOf,
  full,
  geometry,
  solved,
  violations,
} from './rules'
import { countSolutions, solve } from './solver'
import {
  apply,
  hiddenPairs,
  hiddenSingles,
  lockedCandidates,
  nakedPairs,
  nakedSingles,
  nextSteps,
  rate,
  whatIf,
  xWing,
  xyWing,
} from './techniques'
import * as techniques from './techniques'
import { makeGame, minGivens, random } from './generate'

//rows of digits, dots for empty cells
const parse = (rows) => Int8Array.from(rows.join('').split(''), (c) => (c === '.' ? 0 : Number(c)))

//a well known easy puzzle and its solution
const easy = parse([
  '53..7....',
  '6..195...',
  '.98....6.',
  '8...6...3',
  '4..8.3..1',
  '7...2...6',
  '.6....28.',
  '...419..5',
  '....8..79',
])

const easySolution = parse([
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
])

it('builds rows, columns and boxes for each size', () => {
  const { units, unitsOf, peers } = geometry(9)
  expect(units).toHaveLength(27)
  expect(unitsOf.every((list) => list.length === 3)).toBe(true)
  expect(peers.every((list) => list.length === 20)).toBe(true)
  expect(units[18].cells).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20])
  expect(units[22].name).toBe('the centre box')
  //6x6 boxes are three wide and two tall
  const six = geometry(6)
  expect(six.units[12].cells).toEqual([0, 1, 2, 6, 7, 8])
  expect(six.units[13].cells).toEqual([3, 4, 5, 9, 10, 11])
  expect(six.peers[0]).toHaveLength(12)
})

it('finds a digit twice in a unit', () => {
  const board = easy.slice()
  board[2] = 5
  expect(breaks(board, 9)[0].text).toBe('Row 1 has 5 more than once.')
  expect([...violations(board, 9)].sort((a, b) => a - b)).toEqual([0, 2])
  expect(solved(easySolution, 9)).toBe(true)
  expect(solved(easy, 9)).toBe(false)
})

it('solves a known puzzle and counts solutions', () => {
  expect([...solve(easy, 9)]).toEqual([...easySolution])
  expect(countSolutions(easy, 9)).toBe(1)
  const loose = easy.slice()
  loose[0] = EMPTY
  expect(countSolutions(loose, 9)).toBe(1)
  //without these the top and bottom rows' first three digits can swap
  for (const i of [1, 4, 9]) loose[i] = EMPTY
  expect(countSolutions(loose, 9)).toBe(2)
  expect(countSolutions(new Int8Array(81), 9)).toBe(2)
})

it('rates the known easy puzzle easy', () => {
  const { level, solution } = rate(easy, 9)
  expect(level).toBe(0)
  expect([...solution]).toEqual([...easySolution])
})

it('places a hidden single with the digits that block it', () => {
  const cands = candidatesOf(easy, 9)
  const steps = hiddenSingles(easy, cands, 9)
  expect(steps.length).toBeGreaterThan(0)
  for (const { place, sources, text } of steps) {
    const [[i, d]] = place
    expect(easySolution[i]).toBe(d)
    expect(sources.every((s) => easy[s] === d)).toBe(true)
    expect(text).toMatch(new RegExp(`^${d} can only go in one cell of`))
  }
})

it('places a naked single when every other digit is in sight', () => {
  const cands = candidatesOf(easy, 9)
  const steps = nakedSingles(easy, cands, 9)
  expect(steps.length).toBeGreaterThan(0)
  for (const { place, sources, text } of steps) {
    const [[i, d]] = place
    expect(easySolution[i]).toBe(d)
    expect(sources).toHaveLength(8)
    expect(text).toMatch(/Every other digit/)
  }
})

it('removes a digit kept to one line of a box from the rest of the line', () => {
  //1 in the top left box can only be in row 1, so row 1's other cells lose it
  const board = parse([
    '.........',
    '234......',
    '567......',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
    '.........',
  ])
  const cands = candidatesOf(board, 9)
  const pointing = lockedCandidates(board, cands, 9).find(
    (s) => s.technique === 'pointing' && s.text.startsWith('In the top left box, 1'),
  )
  expect(pointing.sources).toEqual([0, 1, 2])
  expect(pointing.remove.map(([i]) => i)).toEqual([3, 4, 5, 6, 7, 8])
  expect(pointing.text).toBe(
    "In the top left box, 1 can only go in row 1, so 1 can't go anywhere else in row 1.",
  )
})

it('removes a naked pair from the rest of its unit and keeps a hidden pair to its cells', () => {
  const board = new Int8Array(81)
  const cands = candidatesOf(board, 9)
  cands[0] = bit(1) | bit(2)
  cands[1] = bit(1) | bit(2)
  const naked = nakedPairs(board, cands, 9).find((s) => s.text.includes('row 1'))
  expect(naked.sources).toEqual([0, 1])
  expect(naked.remove).toContainEqual([2, bit(1) | bit(2)])
  expect(naked.text).toBe(
    "These two cells in row 1 can only hold 1 and 2 between them, so those digits can't go anywhere else in row 1.",
  )

  const fresh = candidatesOf(board, 9)
  for (let c = 2; c < 9; c++) fresh[c] &= ~(bit(3) | bit(4))
  const hidden = hiddenPairs(board, fresh, 9).find((s) => s.text.includes('row 1'))
  expect(hidden.sources).toEqual([0, 1])
  expect(hidden.remove).toEqual([
    [0, fresh[0] & ~(bit(3) | bit(4))],
    [1, fresh[1] & ~(bit(3) | bit(4))],
  ])
  expect(hidden.text).toMatch(/^3 and 4 can only go in these two cells of row 1/)
})

it('finds an x-wing and an xy-wing', () => {
  const board = new Int8Array(81)
  const cands = candidatesOf(board, 9)
  //5 fits only columns 2 and 7 in rows 1 and 4
  for (const r of [0, 3])
    for (let c = 0; c < 9; c++) if (c !== 1 && c !== 6) cands[r * 9 + c] &= ~bit(5)
  const wing = xWing(board, cands, 9).find((s) => s.text.startsWith('In rows 1 and 4, 5'))
  expect(wing.sources).toEqual([1, 6, 28, 33])
  expect(wing.remove.map(([i]) => i)).toContain(10)
  expect(wing.remove.map(([i]) => i)).not.toContain(28)

  const pivots = candidatesOf(board, 9)
  pivots[0] = bit(1) | bit(2)
  pivots[4] = bit(1) | bit(3)
  pivots[36] = bit(2) | bit(3)
  const xy = xyWing(board, pivots, 9).find((s) => s.sources[0] === 0)
  expect(xy.sources).toEqual([0, 4, 36])
  //the cell in row 5 under the first wing sees both wings
  expect(xy.remove).toContainEqual([40, bit(3)])
})

it('rules out a candidate whose singles run into a dead end', () => {
  const { givens } = makeGame(9, 3, random(4))
  const board = givens.slice()
  const cands = candidatesOf(board, 9)
  const solution = solve(givens, 9)
  //lower levels done first, then what-if must take away a wrong candidate
  for (;;) {
    const { level, steps } = nextSteps(board, cands, 9, 2)
    if (!steps.length) break
    expect(level).toBeLessThan(3)
    apply(board, cands, 9, steps)
  }
  const [step] = whatIf(board, cands, 9)
  const [[i, mask]] = step.remove
  expect(digitsOf(mask)).toHaveLength(1)
  expect(solution[i]).not.toBe(digitsOf(mask)[0])
  expect(step.level).toBe(3)
})

//every step every technique offers along the way through dealt boards, checked against the
//solution: nothing placed wrong, nothing true taken away
it('never offers a step the solution disagrees with', () => {
  const all = Object.entries(techniques).filter(
    ([name, fn]) => typeof fn === 'function' && !['nextSteps', 'apply', 'rate'].includes(name),
  )
  const seen = new Set()
  for (let seed = 1; seed <= 30; seed++) {
    const { givens, solution } = makeGame(9, (seed % 3) + 1, random(seed))
    const board = givens.slice()
    const cands = candidatesOf(board, 9)
    while (!full(board)) {
      for (const [, technique] of all) {
        for (const { technique: name, place, remove } of technique(board, cands, 9)) {
          seen.add(name)
          for (const [i, d] of place) expect(solution[i]).toBe(d)
          for (const [i, mask] of remove) expect(mask & bit(solution[i])).toBe(0)
        }
      }
      const { steps } = nextSteps(board, cands, 9)
      expect(steps.length).toBeGreaterThan(0)
      expect(apply(board, cands, 9, steps)).toBe(true)
    }
    expect([...board]).toEqual([...solution])
  }
  for (const name of [
    'hidden-single',
    'naked-single',
    'pointing',
    'claiming',
    'naked-pair',
    'hidden-pair',
    'naked-triple',
    'x-wing',
    'xy-wing',
    'what-if',
  ]) {
    expect(seen).toContain(name)
  }
}, 60000)

it('deals each level exactly, with one solution, symmetric givens and enough of them', () => {
  for (let level = 0; level < 4; level++) {
    for (let seed = 1; seed <= 6; seed++) {
      const started = performance.now()
      const game = makeGame(9, level, random(seed * 7 + level))
      expect(performance.now() - started).toBeLessThan(2000)
      expect(game.level).toBe(level)
      expect(rate(game.givens, 9).level).toBe(level)
      expect(countSolutions(game.givens, 9)).toBe(1)
      expect(game.givens.filter((d) => d).length).toBeGreaterThanOrEqual(minGivens(9, level))
      game.givens.forEach((d, i) => expect(Boolean(d)).toBe(Boolean(game.givens[80 - i])))
      game.givens.forEach((d, i) => d && expect(game.solution[i]).toBe(d))
    }
  }
}, 120000)

it('builds other sizes, so they can be offered later', () => {
  for (const n of [4, 6]) {
    const game = makeGame(n, 1, random(n))
    expect(solved(game.solution, n)).toBe(true)
    expect(countSolutions(game.givens, n)).toBe(1)
  }
})
