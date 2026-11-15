import { EMPTY, all, bit, geometry, pairsOf } from './rules'

const lowest = (mask) => 31 - Math.clz32(mask & -mask)
const highest = (mask) => 31 - Math.clz32(mask)
const single = (mask) => mask && !(mask & (mask - 1))

//every cell's candidates as a mask, a placed digit's own bit
export const masksOf = (board, n) => {
  const masks = new Int32Array(n * n)
  for (let i = 0; i < n * n; i++) masks[i] = board[i] === EMPTY ? all(n) : bit(board[i])
  return masks
}

//narrows masks in place until nothing more follows: a sign keeps its small cell below the big
//one's largest candidate and its big cell above the small one's smallest, a settled cell takes
//its digit from its row and column, and a digit with one place left in a line goes there
//false when a cell runs out of candidates or a line has no place for a digit
export const tighten = (masks, puzzle) => {
  const { n } = puzzle
  const { units, peers } = geometry(n)
  const pairs = pairsOf(puzzle)
  const done = new Uint8Array(n * n)
  for (;;) {
    let changed = false
    const narrow = (i, mask) => {
      if (masks[i] === mask) return true
      masks[i] = mask
      changed = true
      return mask !== 0
    }
    for (const [small, big] of pairs) {
      if (!masks[small] || !masks[big]) return false
      if (!narrow(small, masks[small] & ((1 << highest(masks[big])) - 1))) return false
      if (!narrow(big, masks[big] & ~((2 << lowest(masks[small])) - 1))) return false
    }
    for (let i = 0; i < n * n; i++) {
      if (done[i] || !single(masks[i])) continue
      done[i] = 1
      for (const p of peers[i]) if (!narrow(p, masks[p] & ~masks[i])) return false
    }
    for (const unit of units) {
      for (let d = 0; d < n; d++) {
        let spot = -1
        let count = 0
        for (const i of unit.cells) {
          if (masks[i] & (1 << d)) {
            spot = i
            count++
          }
        }
        if (!count) return false
        if (count === 1 && !narrow(spot, 1 << d)) return false
      }
    }
    if (!changed) return true
  }
}

//walks the solutions from masks, found(masks) returns true to stop
const search = (masks, puzzle, found) => {
  if (!tighten(masks, puzzle)) return false
  let pick = -1
  let fewest = 99
  for (let i = 0; i < masks.length; i++) {
    if (single(masks[i])) continue
    let count = 0
    for (let m = masks[i]; m; m &= m - 1) count++
    if (count < fewest) {
      fewest = count
      pick = i
    }
  }
  if (pick < 0) return found(masks)
  for (let m = masks[pick]; m; m &= m - 1) {
    const trial = masks.slice()
    trial[pick] = m & -m
    if (search(trial, puzzle, found)) return true
  }
  return false
}

//how many solutions a puzzle has, counting no further than limit
export const countSolutions = (puzzle, limit = 2) => {
  let count = 0
  search(masksOf(puzzle.givens, puzzle.n), puzzle, () => ++count >= limit)
  return count
}

//the solution as a board, null when there is none
export const solve = (puzzle) => {
  let solution = null
  search(masksOf(puzzle.givens, puzzle.n), puzzle, (masks) => {
    solution = Int8Array.from(masks, (mask) => highest(mask) + 1)
    return true
  })
  return solution
}
