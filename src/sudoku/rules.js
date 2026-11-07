import { capital } from '../shell/grid'

export { capital }

//boards are Int8Array n * n in row order, 0 empty, 1 to n placed digits
//candidates are bitmasks per cell, bit d - 1 for digit d
export const EMPTY = 0

//sizes offered, and each size's box as width by height; another size is one line in boxShapes
export const sizes = [9]
export const boxShapes = { 4: [2, 2], 6: [3, 2], 9: [3, 3], 12: [4, 3], 16: [4, 4] }

export const emptyBoard = (n) => new Int8Array(n * n)

export const bit = (d) => 1 << (d - 1)
export const all = (n) => (1 << n) - 1

export const countBits = (mask) => {
  let count = 0
  for (let m = mask; m; m &= m - 1) count++
  return count
}

//the digits in a mask, smallest first
export const digitsOf = (mask) => {
  const digits = []
  for (let d = 1; mask >> (d - 1); d++) if (mask & bit(d)) digits.push(d)
  return digits
}

//the lone digit of a one bit mask
export const onlyDigit = (mask) => 31 - Math.clz32(mask) + 1

const boxNames = [
  'top left',
  'top middle',
  'top right',
  'middle left',
  'centre',
  'middle right',
  'bottom left',
  'bottom middle',
  'bottom right',
]

const nameOf = (kind, index, n) => {
  if (kind !== 'box') return `${kind} ${index + 1}`
  return n === 9 ? `the ${boxNames[index]} box` : `box ${index + 1}`
}

const geometries = {}

//the units every digit appears once in: rows, then columns, then boxes
//each unit is { kind, index, cells, name }, unitsOf[i] the three a cell is in, peers[i] the cells
//sharing one with it; a variant adds units here (diagonals) or rules beside them (cages)
export const geometry = (n) => {
  if (geometries[n]) return geometries[n]
  const [bw, bh] = boxShapes[n]
  const units = []
  const add = (kind, index, cells) =>
    units.push({ kind, index, cells, name: nameOf(kind, index, n) })
  for (let r = 0; r < n; r++)
    add(
      'row',
      r,
      Array.from({ length: n }, (_, c) => r * n + c),
    )
  for (let c = 0; c < n; c++)
    add(
      'column',
      c,
      Array.from({ length: n }, (_, r) => r * n + c),
    )
  for (let b = 0; b < n; b++) {
    const top = Math.floor(b / (n / bw)) * bh
    const left = (b % (n / bw)) * bw
    const cells = []
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) cells.push((top + y) * n + left + x)
    add('box', b, cells)
  }
  const unitsOf = Array.from({ length: n * n }, () => [])
  units.forEach((unit) => unit.cells.forEach((i) => unitsOf[i].push(unit)))
  const peers = unitsOf.map((list, i) => {
    const set = new Set(list.flatMap((unit) => unit.cells))
    set.delete(i)
    return [...set]
  })
  const boxOf = (i) => unitsOf[i].find((unit) => unit.kind === 'box').index
  geometries[n] = { n, bw, bh, units, unitsOf, peers, boxOf }
  return geometries[n]
}

export const full = (board) => !board.includes(EMPTY)

//every cell's candidates from the placed digits alone
export const candidatesOf = (board, n) => {
  const { peers } = geometry(n)
  const cands = new Int32Array(n * n)
  for (let i = 0; i < n * n; i++) {
    if (board[i] !== EMPTY) continue
    let mask = all(n)
    for (const p of peers[i]) if (board[p] !== EMPTY) mask &= ~bit(board[p])
    cands[i] = mask
  }
  return cands
}

//units holding a digit twice, as { cells, unit, text }
export const breaks = (board, n) => {
  const found = []
  for (const unit of geometry(n).units) {
    const seen = new Map()
    for (const i of unit.cells) {
      const d = board[i]
      if (d === EMPTY) continue
      if (!seen.has(d)) seen.set(d, [])
      seen.get(d).push(i)
    }
    seen.forEach((cells, d) => {
      if (cells.length < 2) return
      found.push({ cells, unit, text: `${capital(unit.name)} has ${d} more than once.` })
    })
  }
  return found
}

//cells that clash with another of the same digit in a row, column or box
export const violations = (board, n) => new Set(breaks(board, n).flatMap(({ cells }) => cells))

export const solved = (board, n) => full(board) && breaks(board, n).length === 0

//how many of each digit are on the board, index d for digit d
export const digitCounts = (board, n) => {
  const counts = new Array(n + 1).fill(0)
  for (const d of board) counts[d]++
  return counts
}
