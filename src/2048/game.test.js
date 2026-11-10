// @vitest-environment node
import { expect, it } from 'vitest'
import { random } from '../shell/random'
import {
  canMove,
  directions,
  highest,
  linesOf,
  move,
  slide,
  spawn,
  tilesOf,
  valuesOf,
} from './rules'
import { rank, suggest } from './search'

it('orders each line from the edge the tiles slide towards', () => {
  expect(linesOf(3, 'left')[1]).toEqual([3, 4, 5])
  expect(linesOf(3, 'right')[1]).toEqual([5, 4, 3])
  expect(linesOf(3, 'up')[1]).toEqual([1, 4, 7])
  expect(linesOf(3, 'down')[1]).toEqual([7, 4, 1])
})

it('merges each pair once, nearest the edge first, as the original does', () => {
  const row = (values, dir = 'left') => slide([...values, ...new Array(12).fill(0)], 4, dir)
  expect(row([2, 2, 2, 2]).values.slice(0, 4)).toEqual([4, 4, 0, 0])
  expect(row([2, 2, 2, 2]).score).toBe(8)
  expect(row([4, 4, 8, 0]).values.slice(0, 4)).toEqual([8, 8, 0, 0])
  expect(row([2, 0, 2, 4]).values.slice(0, 4)).toEqual([4, 4, 0, 0])
  expect(row([2, 2, 4, 0], 'right').values.slice(0, 4)).toEqual([0, 0, 4, 4])
  expect(row([2, 4, 8, 16]).moved).toBe(false)
})

it('moves tiles with their ids to the same result as the plain move', () => {
  const rng = random(7)
  for (let k = 0; k < 300; k++) {
    const n = 3 + (k % 4)
    const values = Array.from({ length: n * n }, () =>
      rng() < 0.4 ? 0 : 2 ** (1 + Math.floor(rng() * 4)),
    )
    const { tiles } = tilesOf(values, 1)
    for (const dir of directions) {
      const plain = slide(values, n, dir)
      const sliding = move(tiles, n, dir, 100)
      expect(valuesOf(sliding.tiles, n)).toEqual(plain.values)
      expect(sliding.score).toBe(plain.score)
      expect(sliding.moved).toBe(plain.moved)
      //every tile that was there is still drawn, merged or not
      for (const t of tiles) expect(sliding.tiles.some((s) => s.id === t.id)).toBe(true)
    }
  }
})

it('marks the two tiles of a merge gone and makes a new one where they meet', () => {
  const { tiles } = tilesOf([0, 2, 2, 0, 0, 0, 0, 0, 0], 1)
  const { tiles: after } = move(tiles, 3, 'left', 10)
  const gone = after.filter((t) => t.gone)
  expect(gone.map((t) => t.cell)).toEqual([0, 0])
  expect(after.find((t) => t.merged)).toMatchObject({ id: 10, value: 4, cell: 0 })
})

it('spawns a 2 or a 4 in an empty cell, and knows when no move is left', () => {
  const { tiles, nextId } = spawn([], 3, random(1), 1)
  expect(tiles).toHaveLength(1)
  expect([2, 4]).toContain(tiles[0].value)
  expect(nextId).toBe(2)
  expect(canMove([2, 4, 2, 4, 2, 4, 2, 4, 2], 3)).toBe(false)
  expect(canMove([2, 4, 2, 4, 2, 4, 2, 4, 4], 3)).toBe(true)
  expect(canMove([2, 4, 2, 4, 0, 4, 2, 4, 2], 3)).toBe(true)
})

it('only suggests moves that change the board, and says when one is the only one', () => {
  const values = [2, 4, 2, 4, 8, 4, 2, 4, 0]
  const moves = rank(values, 3).map((m) => m.dir)
  expect(moves.sort()).toEqual(['down', 'right'])
  expect(suggest([2, 4, 2, 4, 2, 4, 2, 4, 2], 3)).toBe(null)
  const only = suggest([2, 4, 8, 16, 32, 64, 128, 256, 0], 3)
  expect(['down', 'right']).toContain(only.dir)
})

//the hint is good advice: following it plays a 4x4 game well past 1024
it('plays well when followed, quickly enough for a hint', () => {
  const rng = random(3)
  let { tiles, nextId } = spawn([], 4, rng, 1)
  ;({ tiles, nextId } = spawn(tiles, 4, rng, nextId))
  let moves = 0
  let slowest = 0
  for (;;) {
    const values = valuesOf(tiles, 4)
    const started = performance.now()
    const hint = suggest(values, 4)
    slowest = Math.max(slowest, performance.now() - started)
    if (!hint) break
    const done = move(tiles, 4, hint.dir, nextId)
    ;({ tiles, nextId } = spawn(
      done.tiles.filter((t) => !t.gone),
      4,
      rng,
      done.nextId,
    ))
    if (++moves > 3000) break
  }
  expect(highest(valuesOf(tiles, 4))).toBeGreaterThanOrEqual(1024)
  expect(slowest).toBeLessThan(200)
}, 120000)

it('says an 8 and a 16', () => {
  expect(suggest([4, 4, 0, 0, 0, 0, 0, 0, 0], 3).text).toMatch(/makes an 8/)
  expect(suggest([8, 8, 0, 0, 0, 0, 0, 0, 0], 3).text).toMatch(/makes a 16/)
})

it('answers fast on the biggest board', () => {
  const rng = random(9)
  const values = Array.from({ length: 25 }, () =>
    rng() < 0.3 ? 0 : 2 ** (1 + Math.floor(rng() * 8)),
  )
  const started = performance.now()
  suggest(values, 5)
  expect(performance.now() - started).toBeLessThan(200)
})
