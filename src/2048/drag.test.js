// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { along, finishes, lockOf, offsetsOf, planOf, progressOf } from './drag'
import { move, tilesOf } from './rules'

describe('drag', () => {
  it('locks a direction past a few pixels, the longer way', () => {
    expect(lockOf(5, 3)).toBe(null)
    expect(lockOf(-12, 4)).toBe('left')
    expect(lockOf(3, 20)).toBe('down')
    expect(along('left', -30, 8)).toBe(30)
    expect(along('up', 0, 15)).toBe(-15)
  })

  it('plans each tile to its cell after the move, the furthest setting the pace', () => {
    const { tiles, nextId } = tilesOf([2, 0, 0, 2, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1)
    const plan = planOf(tiles, 4, 'left', nextId)
    expect(plan.moved).toBe(true)
    expect(plan.far).toBe(3)
    const [a, b, c] = tiles
    expect(plan.shift[a.id]).toEqual([0, 0])
    expect(plan.shift[b.id]).toEqual([-3, 0])
    expect(plan.shift[c.id]).toEqual([-1, 0])
    //all arrive together: at half the far distance each is halfway
    const half = offsetsOf(plan, 1.5)
    expect(half[b.id][0]).toBeCloseTo(-1.5)
    expect(half[c.id][0]).toBeCloseTo(-0.5)
    //never past the end or back past the start
    expect(offsetsOf(plan, 9)[b.id][0]).toBe(-3)
    expect(offsetsOf(plan, -2)[b.id][0]).toBeCloseTo(0)
  })

  it('takes the halves of the last merge along with the tile on their cell', () => {
    const start = tilesOf([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1)
    const done = move(start.tiles, 4, 'left', start.nextId)
    const plan = planOf(done.tiles, 4, 'right', done.nextId)
    for (const t of done.tiles) expect(plan.shift[t.id]).toEqual([3, 0])
  })

  it('only nudges a direction that moves nothing', () => {
    const { tiles, nextId } = tilesOf([2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1)
    const plan = planOf(tiles, 4, 'left', nextId)
    expect(plan.moved).toBe(false)
    const far = offsetsOf(plan, 5)[tiles[0].id][0]
    expect(far).toBeLessThan(0)
    expect(far).toBeGreaterThan(-0.15)
    expect(finishes(plan, 300)).toBe(false)
  })

  it('finishes once the finger went more than 10px onwards, like the original', () => {
    const { tiles, nextId } = tilesOf([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1)
    const plan = planOf(tiles, 4, 'left', nextId)
    expect(progressOf(plan, 1.5)).toBe(0.5)
    expect(finishes(plan, 10)).toBe(false)
    expect(finishes(plan, 11)).toBe(true)
    //brought back towards the start, the tiles spring back
    expect(finishes(plan, -20)).toBe(false)
  })
})
