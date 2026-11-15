// @vitest-environment node
import { expect, it } from 'vitest'
import {
  BLANK,
  BULB,
  CROSS,
  EMPTY,
  WHITE,
  besideOf,
  breaks,
  darkLeft,
  emptyBoard,
  litOf,
  sightsOf,
  sizes,
  solved,
} from './rules'
import { countSolutions, settle, solve } from './solver'
import { apply, levels, nextSteps, rate } from './techniques'
import { makeGame, makeLayout, makeSolution, random } from './generate'
import { findHint, guideTopic } from './hint'

//rows of . for white, # for a wall and 0 to 4 for a numbered one
const layoutOf = (rows) =>
  Int8Array.from(rows.join(''), (c) => (c === '#' ? BLANK : c === '.' ? WHITE : Number(c)))

const withBulbs = (n, bulbs, crosses = []) => {
  const board = emptyBoard(n)
  for (const i of bulbs) board[i] = BULB
  for (const i of crosses) board[i] = CROSS
  return board
}

it('sees along rows and columns as far as the next wall', () => {
  const layout = layoutOf(['...', '.#.', '...'])
  const sights = sightsOf(layout, 3)
  expect([...sights[0]].sort()).toEqual([1, 2, 3, 6])
  expect([...sights[1]].sort()).toEqual([0, 2])
  expect(sights[4]).toEqual([])
  expect(besideOf(3)[4]).toEqual([1, 3, 5, 7])
  const lit = litOf(layout, withBulbs(3, [0]), 3)
  expect([...lit]).toEqual([1, 1, 1, 1, 0, 0, 1, 0, 0])
  expect(darkLeft(layout, withBulbs(3, [0]), 3)).toBe(3)
})

it('knows a solved board, and names what breaks one', () => {
  const layout = layoutOf(['.1.', '...', '.#.'])
  //bulbs at the top right and middle left light everything, one of them beside the 1
  expect(solved(layout, withBulbs(3, [2, 3]), 3)).toBe(true)
  //crosses make no difference to a win
  expect(solved(layout, withBulbs(3, [2, 3], [0, 4]), 3)).toBe(true)
  expect(solved(layout, withBulbs(3, [2]), 3)).toBe(false)
  //all lit, but two bulbs share the first column
  const clash = withBulbs(3, [0, 6, 5])
  expect(darkLeft(layout, clash, 3)).toBe(0)
  expect(solved(layout, clash, 3)).toBe(false)
  expect(breaks(layout, clash, 3)[0]).toEqual({
    cells: [0, 6],
    text: 'These two bulbs light each other.',
  })
  expect(breaks(layout, withBulbs(3, [0, 2]), 3).map((b) => b.text)).toContain(
    'The 1 at row 1, column 2 has 2 bulbs beside it, too many.',
  )
  expect(breaks(layout, withBulbs(3, [], [0, 2, 4]), 3)[0].text).toBe(
    'The 1 at row 1, column 2 has too little room left beside it for its bulbs.',
  )
})

it('settles the plain rules and counts solutions', () => {
  //the 2 in the corner needs both cells beside it, and they light the rest
  const layout = layoutOf(['2..', '...', '...'])
  const board = emptyBoard(3)
  expect(settle(layout, 3, board)).toBe(true)
  expect(board[1]).toBe(BULB)
  expect(board[3]).toBe(BULB)
  //an open board with no numbers has many answers, one with a wall asking too much has none
  expect(countSolutions(layoutOf(['...', '...', '...']), 3, 5)).toBe(5)
  expect(countSolutions(layoutOf(['4..', '...', '...']), 3)).toBe(0)
  expect(solve(layoutOf(['4..', '...', '...']), 3)).toBe(null)
  const why = {}
  expect(settle(layoutOf(['4..', '...', '...']), 3, emptyBoard(3), why)).toBe(false)
  expect(why.wall).toBe(0)
})

it('deals boards with one solution that need exactly their level, the same for a seed', () => {
  for (const n of [7, 10]) {
    for (let level = 0; level < levels.length; level++) {
      const game = makeGame(n, level, random(n * 10 + level))
      expect(game.level, `${n} ${level}`).toBe(level)
      expect(countSolutions(game.layout, n, 2)).toBe(1)
      expect([...solve(game.layout, n)]).toEqual([...game.solution])
      const rated = rate(game.layout, n)
      expect(rated.level).toBe(level)
      expect([...rated.solution]).toEqual([...game.solution])
      //the level below can't finish it
      if (level) expect(rate(game.layout, n, level - 1)).toBe(null)
      const again = makeGame(n, level, random(n * 10 + level))
      expect([...again.layout]).toEqual([...game.layout])
    }
  }
  expect(sizes).toEqual([7, 10, 14])
})

it('scatters walls the same turned half round, and lights every cell without a clash', () => {
  const rng = random(9)
  const layout = makeLayout(10, rng)
  layout.forEach((v, i) => expect(v).toBe(layout[99 - i]))
  const bulbs = makeSolution(layout, 10, rng)
  const board = Int8Array.from(bulbs, (v) => (v ? BULB : EMPTY))
  expect(darkLeft(layout, board, 10)).toBe(0)
  expect(breaks(layout, board, 10)).toEqual([])
})

it('finishes every level by following its own hints, each with a reason and a guide section', () => {
  for (let level = 0; level < levels.length; level++) {
    const n = 7
    const { layout, solution } = makeGame(n, level, random(40 + level))
    const board = emptyBoard(n)
    const kinds = new Set()
    for (let turn = 0; turn < 200 && !solved(layout, board, n); turn++) {
      const hint = findHint({ layout, board, solution, n })
      expect(hint.text.length).toBeGreaterThan(10)
      expect(hint.kind).not.toBe('reveal')
      expect(hint.place.some(([, value]) => value === BULB)).toBe(true)
      for (const [i, value] of hint.place) {
        expect(layout[i]).toBe(WHITE)
        expect(value === BULB ? 1 : 0).toBe(solution[i])
        board[i] = value
      }
      kinds.add(guideTopic(hint))
    }
    expect(solved(layout, board, n), `level ${level}`).toBe(true)
    expect(findHint({ layout, board, solution, n }).kind).toBe('solved')
  }
})

it('points at a broken rule first, then at a mark that cannot stand', () => {
  const n = 7
  const { layout, solution } = makeGame(n, 1, random(3))
  const whites = [...layout.keys()].filter((i) => layout[i] === WHITE)
  const notBulb = whites.find((i) => !solution[i])
  const board = emptyBoard(n)
  board[notBulb] = BULB
  const hint = findHint({ layout, board, solution, n })
  expect(['wrong', 'break']).toContain(hint.kind)
  expect(Object.values(hint.marks)).toContain('wrong')
  const isBulb = whites.find((i) => solution[i])
  const crossed = emptyBoard(n)
  crossed[isBulb] = CROSS
  const second = findHint({ layout, board: crossed, solution, n })
  expect(Object.entries(second.marks).find(([, mark]) => mark === 'wrong')[0]).toBe(String(isBulb))
  expect(guideTopic(second)).toBe('mistakes')
})

it('only gives steps the solution agrees with, at every level it tries', () => {
  const n = 10
  const { layout, solution } = makeGame(n, 3, random(77))
  const board = emptyBoard(n)
  while (darkLeft(layout, board, n)) {
    const { steps } = nextSteps(layout, board, n)
    expect(steps.length).toBeGreaterThan(0)
    for (const { place } of steps) {
      for (const [i, value] of place) expect(value === BULB ? 1 : 0).toBe(solution[i])
    }
    expect(apply(board, steps)).toBe(true)
  }
})
