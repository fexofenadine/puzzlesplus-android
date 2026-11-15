// @vitest-environment node
import { expect, it } from 'vitest'
import {
  EMPTY,
  LESS,
  MORE,
  NONE,
  allowed,
  breaks,
  candidatesOf,
  fallback,
  geometry,
  pairsOf,
  sizes,
  solved,
} from './rules'
import { countSolutions, masksOf, solve, tighten } from './solver'
import { apply, levels, nextSteps, rate } from './techniques'
import { makeGame, makeSolution, random } from './generate'
import { findHint, guideTopic } from './hint'

//rows of digits and . for empty; right of < > and spaces, down of ^ v and spaces
const puzzleOf = (rows, right = [], down = []) => {
  const n = rows.length
  const signs = (lines, less, more) =>
    Int8Array.from({ length: n * n }, (_, i) => {
      const c = (lines[Math.floor(i / n)] || '')[i % n]
      return c === less ? LESS : c === more ? MORE : NONE
    })
  return {
    n,
    givens: Int8Array.from(rows.join(''), (c) => (c === '.' ? EMPTY : Number(c))),
    right: signs(right, '<', '>'),
    down: signs(down, '^', 'v'),
  }
}

//every way to finish a puzzle, counted the slow and certain way: cell by cell, no reasoning
const bruteCount = (puzzle, limit = 3) => {
  const { n } = puzzle
  const board = puzzle.givens.slice()
  const pairs = pairsOf(puzzle)
  const { peers } = geometry(n)
  let count = 0
  const fits = (i, d) =>
    peers[i].every((p) => board[p] !== d) &&
    pairs.every(([small, big]) => {
      const a = small === i ? d : board[small]
      const b = big === i ? d : board[big]
      return (small !== i && big !== i) || !a || !b || a < b
    })
  const walk = (i) => {
    if (count >= limit) return
    if (i === n * n) return void count++
    if (board[i] !== EMPTY) return walk(i + 1)
    for (let d = 1; d <= n; d++) {
      if (!fits(i, d)) continue
      board[i] = d
      walk(i + 1)
      board[i] = EMPTY
    }
  }
  //the givens themselves must not clash
  if (breaks(board, puzzle).length) return 0
  walk(0)
  return count
}

it('names rows and columns as units and lists the signs as small and big cells', () => {
  const { units, peers } = geometry(4)
  expect(units).toHaveLength(8)
  expect(peers[0].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 8, 12])
  const puzzle = puzzleOf(['....', '....', '....', '....'], ['<   ', ' >  '], ['^   ', 'v   '])
  expect(pairsOf(puzzle)).toEqual([
    [0, 1],
    [0, 4],
    [8, 4],
    [6, 5],
  ])
  expect(sizes).toEqual([4, 5, 6, 7])
  expect(allowed(4, 2)).toBe(false)
  expect(fallback(4, 2)).toBe(1)
  expect(allowed(7, 3)).toBe(true)
})

it('knows a solved board, and names a repeat or digits the wrong way round for a sign', () => {
  const puzzle = puzzleOf(['12', '21'], ['< '], [' v'])
  expect(solved(Int8Array.from([1, 2, 2, 1]), puzzle)).toBe(true)
  expect(solved(Int8Array.from([1, 2, 2, 0]), puzzle)).toBe(false)
  expect(breaks(Int8Array.from([2, 1, 0, 0]), puzzle).map((b) => b.text)).toEqual([
    'The sign between these cells says the 2 should be the smaller one.',
  ])
  expect(breaks(Int8Array.from([1, 1, 0, 0]), puzzle)[0].text).toBe('Row 1 has 1 more than once.')
  expect([...candidatesOf(Int8Array.from([1, 0, 0, 0]), 2)]).toEqual([0, 2, 2, 3])
})

it('tightens candidates by the signs and the lines, and never loses the solution', () => {
  const rng = random(4)
  for (const n of [4, 5, 6]) {
    const solution = makeSolution(n, rng)
    //a latin square: every row and column holds each digit once
    for (const unit of geometry(n).units) {
      expect(new Set(unit.cells.map((i) => solution[i])).size).toBe(n)
    }
    const game = makeGame(n, 1, random(n))
    const masks = masksOf(game.givens, n)
    expect(tighten(masks, game)).toBe(true)
    game.solution.forEach((d, i) => expect(masks[i] & (1 << (d - 1))).toBeTruthy())
  }
  //a < b < c < d along a row of four leaves one way
  const chain = puzzleOf(['....', '....', '....', '....'], ['<<< '])
  const masks = masksOf(chain.givens, 4)
  expect(tighten(masks, chain)).toBe(true)
  expect([...masks.slice(0, 4)]).toEqual([1, 2, 4, 8])
  //and a sign nothing can satisfy is a dead end
  const dead = puzzleOf(['4.', '..'], ['< '])
  expect(tighten(masksOf(dead.givens, 2), dead)).toBe(false)
})

it('counts solutions as the slow certain count does, and deals boards with just one', () => {
  expect(countSolutions(puzzleOf(['..', '..']), 5)).toBe(2)
  expect(countSolutions(puzzleOf(['..', '..'], ['< ']))).toBe(1)
  expect([...solve(puzzleOf(['..', '..'], ['< ']))]).toEqual([1, 2, 2, 1])
  expect(solve(puzzleOf(['2.', '..'], ['< ']))).toBe(null)
  for (const n of [4, 5]) {
    for (let level = 0; level < levels.length; level++) {
      if (!allowed(n, level)) continue
      for (let seed = 1; seed <= 3; seed++) {
        const game = makeGame(n, level, random(seed * 13 + level))
        expect(bruteCount(game), `${n} ${level} ${seed}`).toBe(1)
        expect(countSolutions(game)).toBe(1)
        expect([...solve(game)]).toEqual([...game.solution])
        //a clue fewer and the count agrees too, whatever it is
        const fewer = { ...game, givens: game.givens.slice() }
        const at = fewer.givens.findIndex((v) => v !== EMPTY)
        if (at >= 0) {
          fewer.givens[at] = EMPTY
          expect(countSolutions(fewer, 3)).toBe(bruteCount(fewer, 3))
        }
      }
    }
  }
})

//a busy machine deals slowly, so the search gets all the time it needs
it('deals boards that need exactly their level, the same for a seed', { timeout: 120000 }, () => {
  for (const n of [5, 7]) {
    for (let level = 0; level < levels.length; level++) {
      const game = makeGame(n, level, random(n * 10 + level), 30000)
      expect(game.level, `${n} ${level}`).toBe(level)
      const rated = rate(game)
      expect(rated.level).toBe(level)
      expect([...rated.solution]).toEqual([...game.solution])
      if (level) expect(rate(game, level - 1)).toBe(null)
      const again = makeGame(n, level, random(n * 10 + level), 30000)
      expect([...again.givens]).toEqual([...game.givens])
      expect([...again.right]).toEqual([...game.right])
      //every sign left agrees with the solution
      for (const [small, big] of pairsOf(game)) {
        expect(game.solution[small]).toBeLessThan(game.solution[big])
      }
    }
  }
})

it('only gives steps the solution agrees with, at every level it tries', () => {
  for (const n of [5, 6]) {
    const game = makeGame(n, 3, random(70 + n))
    const board = game.givens.slice()
    const cands = candidatesOf(board, n)
    while (board.includes(EMPTY)) {
      const { steps } = nextSteps(game, board, cands)
      expect(steps.length).toBeGreaterThan(0)
      for (const { place, remove } of steps) {
        for (const [i, d] of place) expect(d).toBe(game.solution[i])
        for (const [i, mask] of remove) expect(mask & (1 << (game.solution[i] - 1))).toBe(0)
      }
      expect(apply(game, board, cands, steps)).toBe(true)
    }
  }
})

it('finishes every level by following its own hints, each with a reason and a guide section', () => {
  for (let level = 0; level < levels.length; level++) {
    const game = makeGame(5, level, random(30 + level))
    const board = game.givens.slice()
    for (let turn = 0; turn < 60 && !solved(board, game); turn++) {
      const hint = findHint({ board, solution: game.solution, puzzle: game })
      expect(hint.text.length).toBeGreaterThan(10)
      expect(hint.kind).not.toBe('reveal')
      expect(guideTopic(hint)).toBeTruthy()
      for (const [i, d] of hint.place) {
        expect(d).toBe(game.solution[i])
        board[i] = d
      }
    }
    expect(solved(board, game), `level ${level}`).toBe(true)
    expect(findHint({ board, solution: game.solution, puzzle: game }).kind).toBe('solved')
  }
})

it('points at a broken rule first, then at a digit that cannot stand', () => {
  const game = makeGame(5, 1, random(8))
  const open = game.givens.indexOf(EMPTY)
  const board = game.givens.slice()
  board[open] = (game.solution[open] % 5) + 1
  const hint = findHint({ board, solution: game.solution, puzzle: game })
  expect(['wrong', 'break']).toContain(hint.kind)
  expect(hint.marks[open]).toBe('wrong')
  expect(guideTopic(hint)).toBe('mistakes')
})
