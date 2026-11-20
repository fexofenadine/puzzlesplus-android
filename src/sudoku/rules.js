import { capital } from '../shell/grid'

export { capital }

//boards are Int8Array n * n in row order, 0 empty, 1 to n placed digits
//candidates are bitmasks per cell, bit d - 1 for digit d
export const EMPTY = 0

//sizes offered, and each size's box as width by height; another size is one line in boxShapes
export const sizes = [4, 6, 9]
export const boxShapes = { 4: [2, 2], 6: [3, 2], 9: [3, 3], 12: [4, 3], 16: [4, 4] }

//4x4 boards never need more than singles, and a 6x6 that needs exactly medium is too rare to deal
export const allowed = (n, level) => (n === 4 ? level === 0 : n === 6 ? level !== 1 : true)

//the level asked for, or the hardest one below it that the size allows
export const fallback = (n, level) => (allowed(n, level) ? level : fallback(n, level - 1))

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

//two or three boxes along a side have names, more are numbered
const places = (count, first, last) =>
  count === 2 ? [first, last] : count === 3 ? [first, 'middle', last] : null

//the top left box, the centre box, or box 7 on a board too big for names
const boxName = (index, n) => {
  const [bw, bh] = boxShapes[n]
  const across = places(n / bw, 'left', 'right')
  const down = places(n / bh, 'top', 'bottom')
  if (!across || !down) return `box ${index + 1}`
  const x = across[index % (n / bw)]
  const y = down[Math.floor(index / (n / bw))]
  return x === 'middle' && y === 'middle' ? 'the centre box' : `the ${y} ${x} box`
}

const nameOf = (kind, index, n) => (kind === 'box' ? boxName(index, n) : `${kind} ${index + 1}`)

//a jigsaw layout is a string of n * n digits, the region (0 to n - 1) each cell belongs to
export const jigsaw = 'jigsaw'

//every region holds n connected cells
export const validLayout = (layout, n = 9) => {
  if (typeof layout !== 'string' || layout.length !== n * n || !/^\d+$/.test(layout)) return false
  const regions = Array.from({ length: n }, () => [])
  for (let i = 0; i < layout.length; i++) {
    const r = Number(layout[i])
    if (r >= n) return false
    regions[r].push(i)
  }
  return regions.every((cells) => cells.length === n && connected(cells, n))
}

//whether cells (indices on an n wide board) form one piece, sharing edges
export const connected = (cells, n) => {
  const rest = new Set(cells)
  const todo = [cells[0]]
  rest.delete(cells[0])
  while (todo.length) {
    const i = todo.pop()
    const x = i % n
    for (const j of [i - n, i + n, x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1]) {
      if (rest.delete(j)) todo.push(j)
    }
  }
  return rest.size === 0
}

//a region is named by its first cell in reading order, the one thing that is easy to find
const regionName = (cells, n) =>
  `the region from row ${Math.floor(cells[0] / n) + 1}, column ${(cells[0] % n) + 1}`

//the latest geometries kept, since every jigsaw deal makes layouts of its own
const geometries = new Map()

//the units every digit appears once in: rows, columns, boxes (or a jigsaw's regions), each
//{ kind, index, cells, name }; unitsOf[i] are the three a cell is in, peers[i] the cells
//sharing one; variants add units here
export const geometry = (n, layout) => {
  const key = `${n}${layout ? `:${layout}` : ''}`
  if (geometries.has(key)) return geometries.get(key)
  const [bw, bh] = layout ? [3, 3] : boxShapes[n]
  const units = []
  const add = (kind, index, cells, name = nameOf(kind, index, n)) =>
    units.push({ kind, index, cells, name })
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
  if (layout) {
    //regions go in the order their first cells come, so the names read left to right
    const found = Array.from({ length: n }, () => [])
    for (let i = 0; i < layout.length; i++) found[Number(layout[i])].push(i)
    found.sort((a, b) => a[0] - b[0])
    found.forEach((cells, b) => add('box', b, cells, regionName(cells, n)))
  } else {
    for (let b = 0; b < n; b++) {
      const top = Math.floor(b / (n / bw)) * bh
      const left = (b % (n / bw)) * bw
      const cells = []
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) cells.push((top + y) * n + left + x)
      add('box', b, cells)
    }
  }
  const unitsOf = Array.from({ length: n * n }, () => [])
  units.forEach((unit) => unit.cells.forEach((i) => unitsOf[i].push(unit)))
  const peers = unitsOf.map((list, i) => {
    const set = new Set(list.flatMap((unit) => unit.cells))
    set.delete(i)
    return [...set]
  })
  const boxOf = (i) => unitsOf[i].find((unit) => unit.kind === 'box').index
  const word = layout ? 'region' : 'box'
  const made = { n, bw, bh, units, unitsOf, peers, boxOf, word, layout }
  if (geometries.size >= 12) geometries.delete(geometries.keys().next().value)
  geometries.set(key, made)
  return made
}

export const full = (board) => !board.includes(EMPTY)

//every cell's candidates from the placed digits alone
export const candidatesOf = (board, n, layout) => {
  const { peers } = geometry(n, layout)
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
export const breaks = (board, n, layout) => {
  const found = []
  for (const unit of geometry(n, layout).units) {
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

//cells that clash with another of the same digit in a row, column or box (or region)
export const violations = (board, n, layout) =>
  new Set(breaks(board, n, layout).flatMap(({ cells }) => cells))

export const solved = (board, n, layout) => full(board) && breaks(board, n, layout).length === 0

//how many of each digit are on the board, index d for digit d
export const digitCounts = (board, n) => {
  const counts = new Array(n + 1).fill(0)
  for (const d of board) counts[d]++
  return counts
}
