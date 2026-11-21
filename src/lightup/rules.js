import { cellName } from '../shell/grid'
//light up: bulbs on the white cells of a grid of walls, until every white cell is lit
//a bulb lights its row and column as far as the next wall, no bulb may light another, and a
//numbered wall has exactly that many bulbs in the four cells beside it

//a layout is n * n cells in row order: WHITE, a wall numbered 0 to 4, or a BLANK wall
export const WHITE = -1
export const BLANK = 5

//a board is the player's marks on the white cells; a cross is a note that no bulb goes there
export const EMPTY = -1
export const CROSS = 0
export const BULB = 1

export const sizes = [7, 10, 14]

export const emptyBoard = (n) => new Int8Array(n * n).fill(EMPTY)

export { cellName }

const besideCache = {}

//the cells beside each cell, up to four
export const besideOf = (n) =>
  (besideCache[n] ??= Array.from({ length: n * n }, (_, i) => {
    const x = i % n
    const y = Math.floor(i / n)
    const list = []
    if (y > 0) list.push(i - n)
    if (x > 0) list.push(i - 1)
    if (x < n - 1) list.push(i + 1)
    if (y < n - 1) list.push(i + n)
    return list
  }))

const sightCache = new WeakMap()

//for each white cell, the white cells in line with it up to the next wall, itself left out
export const sightsOf = (layout, n) => {
  let sights = sightCache.get(layout)
  if (sights) return sights
  sights = Array.from({ length: n * n }, (_, i) => {
    if (layout[i] !== WHITE) return []
    const x = i % n
    const y = Math.floor(i / n)
    const seen = []
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      let cx = x + dx
      let cy = y + dy
      while (cx >= 0 && cy >= 0 && cx < n && cy < n && layout[cy * n + cx] === WHITE) {
        seen.push(cy * n + cx)
        cx += dx
        cy += dy
      }
    }
    return seen
  })
  sightCache.set(layout, sights)
  return sights
}

//which white cells are lit: a bulb's own cell and every cell it sees
export const litOf = (layout, board, n) => {
  const sights = sightsOf(layout, n)
  const lit = new Uint8Array(n * n)
  for (let i = 0; i < n * n; i++) {
    if (board[i] !== BULB || layout[i] !== WHITE) continue
    lit[i] = 1
    for (const c of sights[i]) lit[c] = 1
  }
  return lit
}

//the white cells still dark
export const darkLeft = (layout, board, n) => {
  const lit = litOf(layout, board, n)
  let left = 0
  for (let i = 0; i < n * n; i++) if (layout[i] === WHITE && !lit[i]) left++
  return left
}

//each broken rule with its cells and a sentence: bulbs that light each other, a wall with too
//many bulbs, or one that can no longer reach its number
export const breaks = (layout, board, n) => {
  const sights = sightsOf(layout, n)
  const beside = besideOf(n)
  const lit = litOf(layout, board, n)
  const found = []
  for (let i = 0; i < n * n; i++) {
    if (layout[i] === WHITE) {
      if (board[i] !== BULB) continue
      const other = sights[i].find((c) => c > i && board[c] === BULB)
      if (other !== undefined) {
        found.push({ cells: [i, other], text: 'These two bulbs light each other.' })
      }
      continue
    }
    if (layout[i] === BLANK) continue
    const around = beside[i].filter((c) => layout[c] === WHITE)
    const bulbs = around.filter((c) => board[c] === BULB)
    const free = around.filter((c) => board[c] === EMPTY && !lit[c])
    if (bulbs.length > layout[i]) {
      found.push({
        cells: [i, ...bulbs],
        text: `The ${layout[i]} at ${cellName(i, n)} has ${bulbs.length} bulbs beside it, too many.`,
      })
    } else if (bulbs.length + free.length < layout[i]) {
      found.push({
        cells: [i, ...around.filter((c) => board[c] !== BULB)],
        text: `The ${layout[i]} at ${cellName(i, n)} has too little room left beside it for its bulbs.`,
      })
    }
  }
  return found
}

export const violations = (layout, board, n) =>
  new Set(breaks(layout, board, n).flatMap((b) => b.cells))

//every white cell lit, no bulb lighting another and every number met; crosses are never needed
export const solved = (layout, board, n) => {
  if (darkLeft(layout, board, n)) return false
  const sights = sightsOf(layout, n)
  const beside = besideOf(n)
  for (let i = 0; i < n * n; i++) {
    if (layout[i] === WHITE) {
      if (board[i] === BULB && sights[i].some((c) => board[c] === BULB)) return false
    } else if (layout[i] !== BLANK) {
      const bulbs = beside[i].filter((c) => layout[c] === WHITE && board[c] === BULB).length
      if (bulbs !== layout[i]) return false
    }
  }
  return true
}
