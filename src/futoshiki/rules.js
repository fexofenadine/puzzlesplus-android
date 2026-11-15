import { all, bit, countBits, digitCounts, digitsOf, onlyDigit } from '../sudoku/rules'
import { capital } from '../shell/grid'

export { all, bit, capital, countBits, digitCounts, digitsOf, onlyDigit }

//futoshiki: a latin square with greater than and less than signs between some neighbours
//a puzzle is { n, givens, right, down }: boards are Int8Array n * n in row order, 0 empty and
//1 to n placed digits; right[i] is the sign between cell i and the cell to its right, down[i]
//the one between it and the cell below
export const EMPTY = 0

export const NONE = 0
//the cell is less than its neighbour to the right or below
export const LESS = 1
export const MORE = 2

export const sizes = [4, 5, 6, 7]

//a 4 x 4 board that needs pairs is too rare to deal
export const allowed = (n, level) => level >= 0 && level < 4 && !(n === 4 && level === 2)

//the level asked for, or the hardest one below it that the size allows
export const fallback = (n, level) => (allowed(n, level) ? level : fallback(n, level - 1))

export const emptyBoard = (n) => new Int8Array(n * n)

export const cellName = (i, n) => `row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`

const geometries = {}

//the units every digit appears once in, rows then columns, each { kind, index, cells, name }
//unitsOf[i] are the two a cell is in, peers[i] the cells sharing one
export const geometry = (n) => {
  if (geometries[n]) return geometries[n]
  const units = []
  for (let r = 0; r < n; r++) {
    const cells = Array.from({ length: n }, (_, c) => r * n + c)
    units.push({ kind: 'row', index: r, cells, name: `row ${r + 1}` })
  }
  for (let c = 0; c < n; c++) {
    const cells = Array.from({ length: n }, (_, r) => r * n + c)
    units.push({ kind: 'column', index: c, cells, name: `column ${c + 1}` })
  }
  const unitsOf = Array.from({ length: n * n }, () => [])
  units.forEach((unit) => unit.cells.forEach((i) => unitsOf[i].push(unit)))
  const peers = unitsOf.map((list, i) => {
    const set = new Set(list.flatMap((unit) => unit.cells))
    set.delete(i)
    return [...set]
  })
  geometries[n] = { n, units, unitsOf, peers }
  return geometries[n]
}

const pairCache = new WeakMap()

//every sign as [small, big], the two cells it sits between
export const pairsOf = ({ n, right, down }) => {
  //kept per pair of sign boards, a puzzle that changes either gets its own list
  let byDown = pairCache.get(right)
  if (!byDown) pairCache.set(right, (byDown = new WeakMap()))
  let pairs = byDown.get(down)
  if (pairs) return pairs
  pairs = []
  for (let i = 0; i < n * n; i++) {
    if (right[i] === LESS) pairs.push([i, i + 1])
    if (right[i] === MORE) pairs.push([i + 1, i])
    if (down[i] === LESS) pairs.push([i, i + n])
    if (down[i] === MORE) pairs.push([i + n, i])
  }
  byDown.set(down, pairs)
  return pairs
}

export const full = (board) => !board.includes(EMPTY)

//every empty cell's candidates from the digits placed in its row and column alone
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

//each broken rule with its cells and a sentence: a digit twice in a line, or two digits the
//wrong way round for the sign between them
export const breaks = (board, puzzle) => {
  const { n } = puzzle
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
      found.push({ cells, text: `${capital(unit.name)} has ${d} more than once.` })
    })
  }
  for (const [small, big] of pairsOf(puzzle)) {
    if (board[small] === EMPTY || board[big] === EMPTY || board[small] < board[big]) continue
    found.push({
      cells: [small, big],
      text: `The sign between these cells says the ${board[small]} should be the smaller one.`,
    })
  }
  return found
}

export const violations = (board, puzzle) =>
  new Set(breaks(board, puzzle).flatMap(({ cells }) => cells))

export const solved = (board, puzzle) => full(board) && breaks(board, puzzle).length === 0
