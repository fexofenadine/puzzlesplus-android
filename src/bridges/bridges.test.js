// @vitest-environment node
import { expect, it } from 'vitest'
import {
  breaks,
  degreesOf,
  emptyBoard,
  groupsOf,
  linkBetween,
  linksOf,
  sizes,
  solved,
  stepLink,
  unfinished,
} from './rules'
import { countSolutions, solve } from './solver'
import { apply, levels, nextSteps, rate } from './techniques'
import { makeGame, makeIslands, random } from './generate'
import { findHint, guideTopic } from './hint'

//rows of . for water and 1 to 8 for an island
const islandsOf = (rows) => Int8Array.from(rows.join(''), (c) => (c === '.' ? 0 : Number(c)))

//a loop of four islands, and a cross of four that can't both be joined
const square = islandsOf(['2.2', '...', '2.2'])
const cross = islandsOf(['.1.', '1.1', '.1.'])

it('finds the links between islands in line, with the water and what crosses', () => {
  const { links, at, over, through } = linksOf(cross, 3)
  expect(links.map(({ a, b, cells }) => [a, b, cells])).toEqual([
    [3, 5, [4]],
    [1, 7, [4]],
  ])
  expect(at.get(1)).toEqual([1])
  expect(over).toEqual([[1], [0]])
  expect(through.get(4)).toEqual([0, 1])
  //a link takes no more than the smaller number, or two
  const { links: loop } = linksOf(square, 3)
  expect(loop.map((l) => l.max)).toEqual([2, 2, 2, 2])
  expect(linksOf(islandsOf(['1.3']), 3).links[0].max).toBe(1)
})

it('steps a link through 0, 1 and 2, and refuses where a bridge crosses', () => {
  const board = emptyBoard(2)
  expect(stepLink(cross, 3, board, 0)).toBe(1)
  board[0] = 2
  expect(stepLink(cross, 3, board, 0)).toBe(0)
  expect(stepLink(cross, 3, board, 0, true)).toBe(1)
  board[0] = 1
  expect(stepLink(cross, 3, board, 1)).toBe(null)
  expect(stepLink(cross, 3, board, 0, true)).toBe(0)
  //a link that takes one bridge goes round on one
  const small = islandsOf(['1.1'])
  expect(stepLink(small, 3, emptyBoard(1), 0)).toBe(1)
  expect(stepLink(small, 3, Int8Array.of(1), 0)).toBe(0)
  expect(stepLink(small, 3, emptyBoard(1), 0, true)).toBe(1)
  expect(linkBetween(cross, 3, 7, 1)).toBe(1)
})

it('knows a solved board, and names what breaks one', () => {
  const ring = Int8Array.of(1, 1, 1, 1)
  expect(solved(square, 3, ring)).toBe(true)
  expect(unfinished(square, 3, ring)).toBe(0)
  expect([...degreesOf(square, 3, ring)]).toEqual([2, 0, 2, 0, 0, 0, 2, 0, 2])
  //doubled along the top and bottom: every island is full, but the two pairs are apart
  const apart = Int8Array.of(2, 2, 0, 0)
  expect(solved(square, 3, apart)).toBe(false)
  expect(groupsOf(square, 3, apart)).toHaveLength(2)
  expect(breaks(square, 3, apart)[0].text).toMatch(/cut off|nothing joins/)
  expect(unfinished(square, 3, Int8Array.of(1, 0, 0, 0))).toBe(4)
  //too many on an island
  const many = islandsOf(['1.2'])
  expect(breaks(many, 3, Int8Array.of(2))[0].text).toMatch(/too many/)
  //bridges across each other
  expect(breaks(cross, 3, Int8Array.of(1, 1)).map((b) => b.text)).toContain(
    'These two bridges cross.',
  )
  expect(breaks(square, 3, Int8Array.of(1, 1, 1, 1))).toEqual([])
})

it('counts the solutions of a puzzle and finds one', () => {
  expect(countSolutions(square, 3)).toBe(1)
  expect([...solve(square, 3)]).toEqual([1, 1, 1, 1])
  //two islands of 1 and 2 can't be met, and a plain line of three has two ways
  expect(countSolutions(islandsOf(['1.2']), 3)).toBe(0)
  expect(solve(islandsOf(['1.2']), 3)).toBe(null)
  expect(countSolutions(cross, 3)).toBe(0)
  const line = islandsOf(['1.3.2'])
  expect(countSolutions(line, 5)).toBe(1)
  expect([...solve(line, 5)]).toEqual([1, 2])
})

it('grades with the techniques and finishes a board it solves', () => {
  //nothing is forced on the ring until a double bridge is seen to cut a pair off
  const rated = rate(square, 3)
  expect(rated.level).toBe(2)
  expect([...rated.solution]).toEqual([1, 1, 1, 1])
  const line = islandsOf(['1.2.1'])
  expect(rate(line, 5).level).toBe(0)
  const { steps, level } = nextSteps(line, 5, { lo: new Int8Array(2), hi: Int8Array.of(1, 1) })
  expect(level).toBe(0)
  expect(steps[0].technique).toBe('need')
  expect(steps[0].text).toMatch(
    /^The 1 at row 1, column 1 needs 1 bridge, and it has no other neighbour/,
  )
  expect(levels).toHaveLength(4)
})

it('applies steps and reports a clash', () => {
  const state = { lo: Int8Array.of(0), hi: Int8Array.of(1) }
  expect(apply(state, [{ change: [[0, 1, 1]] }])).toBe(true)
  expect(state.lo[0]).toBe(1)
  expect(apply(state, [{ change: [[0, 0, 0]] }])).toBe(false)
})

it('deals islands that are joined, never beside each other, each numbered by its bridges', () => {
  for (let seed = 0; seed < 40; seed++) {
    for (const n of sizes) {
      const { islands, solution } = makeIslands(n, random(seed))
      expect(solved(islands, n, solution)).toBe(true)
      for (let i = 0; i < n * n; i++) {
        if (!islands[i]) continue
        expect(islands[i]).toBeLessThanOrEqual(8)
        if (i % n < n - 1) expect(islands[i + 1]).toBe(0)
        if (i + n < n * n) expect(islands[i + n]).toBe(0)
      }
    }
  }
})

it('deals every size and level exactly, with one solution the techniques find', () => {
  for (const n of sizes) {
    levels.forEach((_, level) => {
      const game = makeGame(n, level, random(level * 31 + n), 20000)
      expect(game.level).toBe(level)
      expect(countSolutions(game.islands, n, 2)).toBe(1)
      expect(rate(game.islands, n).level).toBe(level)
      expect(solved(game.islands, n, game.solution)).toBe(true)
    })
  }
}, 120000)

it('hints lead to the solution one bridge at a time', () => {
  const n = 10
  const { islands, solution } = makeGame(n, 2, random(5), 20000)
  const board = emptyBoard(linksOf(islands, n).links.length)
  for (let k = 0; k < 400 && !solved(islands, n, board); k++) {
    const hint = findHint({ islands, board, solution, n })
    expect(hint.text.length).toBeGreaterThan(10)
    for (const [l, count] of hint.place) board[l] = count
  }
  expect(solved(islands, n, board)).toBe(true)
  expect(findHint({ islands, board, solution, n }).kind).toBe('solved')
})

it('names a broken rule before any step', () => {
  const board = Int8Array.of(2, 0, 0, 0)
  const hint = findHint({ islands: square, board, solution: Int8Array.of(1, 1, 1, 1), n: 3 })
  expect(hint.kind).toBe('break')
  expect(Object.keys(hint.marks.cells).length).toBeGreaterThan(0)
  expect(guideTopic({ kind: 'wrong' })).toBe('mistakes')
  expect(guideTopic({ kind: 'isolate' })).toBe('isolate')
})
