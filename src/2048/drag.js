import { move } from './rules'

//a drag settles on a direction after this many pixels and keeps it until the finger lifts
export const LOCK = 10

//how far the tiles nudge, in cells, when the direction can't move anything
const NUDGE = 0.12

//the direction a drag of dx, dy pixels settles on, or null while it is still too short
export const lockOf = (dx, dy) => {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

//pixels moved along a direction, negative when back towards the start
export const along = (dir, dx, dy) => ({ left: -dx, right: dx, up: -dy, down: dy })[dir]

//where each tile would go: { moved, far, shift: { id: [dx, dy] } } in cells
//far is the longest way any tile travels, so all of them arrive together
//halves of a last move's merge go with the tile on their cell
export const planOf = (tiles, n, dir, nextId) => {
  const done = move(tiles, n, dir, nextId)
  const to = new Map()
  for (const t of done.tiles) if (t.id < nextId) to.set(t.id, t.cell)
  const shift = {}
  const byCell = {}
  let far = 0
  for (const t of tiles) {
    if (t.gone) continue
    const cell = to.get(t.id)
    const dx = (cell % n) - (t.cell % n)
    const dy = Math.floor(cell / n) - Math.floor(t.cell / n)
    shift[t.id] = [dx, dy]
    byCell[t.cell] = shift[t.id]
    far = Math.max(far, Math.abs(dx) + Math.abs(dy))
  }
  for (const t of tiles) if (t.gone) shift[t.id] = byCell[t.cell] || [0, 0]
  return { dir, moved: done.moved, far, shift }
}

const unit = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }

//each tile's offset in cells when the finger has gone cells along the plan's direction
//a move follows the finger, scaled to the furthest tile, a stuck direction only nudges
export const offsetsOf = (plan, cells) => {
  const offsets = {}
  if (!plan.moved) {
    const [ux, uy] = unit[plan.dir]
    const r = NUDGE * (1 - Math.exp(-Math.max(0, cells) * 2))
    for (const id in plan.shift) offsets[id] = [ux * r, uy * r]
    return offsets
  }
  const p = progressOf(plan, cells)
  for (const id in plan.shift) {
    const [dx, dy] = plan.shift[id]
    offsets[id] = [dx * p, dy * p]
  }
  return offsets
}

//how far through the move the tiles are, 0 to 1
export const progressOf = (plan, cells) =>
  plan.moved ? Math.min(1, Math.max(0, cells / plan.far)) : 0

//a release more than LOCK pixels onwards finishes the move, like the original's touchend
//only a finger brought back near its start lets the tiles spring back
export const finishes = (plan, pixels) => plan.moved && pixels > LOCK
