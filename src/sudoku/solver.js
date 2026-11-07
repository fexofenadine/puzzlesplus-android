import { EMPTY, bit, candidatesOf, countBits, digitsOf, geometry, onlyDigit } from './rules'

//places a digit and takes it from its peers' candidates, false when a peer runs out
const place = (board, cands, peers, i, d) => {
  board[i] = d
  cands[i] = 0
  const b = bit(d)
  for (const p of peers[i]) {
    if (board[p] !== EMPTY || !(cands[p] & b)) continue
    cands[p] &= ~b
    if (!cands[p]) return false
  }
  return true
}

//placing what is forced: cells with one candidate, digits with one place left in a unit
//works in place, false on a contradiction
export const settle = (board, cands, n) => {
  const { units, peers } = geometry(n)
  for (let changed = true; changed;) {
    changed = false
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== EMPTY) continue
      const mask = cands[i]
      if (!mask) return false
      if (mask & (mask - 1)) continue
      if (!place(board, cands, peers, i, onlyDigit(mask))) return false
      changed = true
    }
    for (const { cells } of units) {
      let once = 0
      let twice = 0
      let placed = 0
      for (const i of cells) {
        if (board[i] !== EMPTY) {
          placed |= bit(board[i])
          continue
        }
        twice |= once & cands[i]
        once |= cands[i]
      }
      if ((once | placed) !== (1 << n) - 1) return false
      let lone = once & ~twice & ~placed
      while (lone) {
        const b = lone & -lone
        lone &= lone - 1
        const i = cells.find((c) => board[c] === EMPTY && cands[c] & b)
        if (i === undefined) continue
        if (!place(board, cands, peers, i, onlyDigit(b))) return false
        changed = true
      }
    }
  }
  return true
}

//the empty cell with the fewest candidates, -1 when the board is full
const narrowest = (board, cands) => {
  let best = -1
  let fewest = 99
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY) continue
    const count = countBits(cands[i])
    if (count < fewest) {
      fewest = count
      best = i
      if (count === 2) break
    }
  }
  return best
}

//depth first search over the narrowest cell, calling found(board) on each solution until it
//returns true; order shuffles a cell's digits, steps counts down guesses, null when out of them
const search = (board, cands, n, found, order, budget) => {
  if (!settle(board, cands, n)) return false
  const i = narrowest(board, cands)
  if (i < 0) return found(board)
  for (const d of order(digitsOf(cands[i]))) {
    if (--budget.steps < 0) return null
    const nextBoard = board.slice()
    const nextCands = cands.slice()
    if (!place(nextBoard, nextCands, geometry(n).peers, i, d)) continue
    const done = search(nextBoard, nextCands, n, found, order, budget)
    if (done !== false) return done
  }
  return false
}

const asIs = (list) => list

//how many solutions, counting no further than limit
export const countSolutions = (board, n, limit = 2) => {
  let count = 0
  search(board.slice(), candidatesOf(board, n), n, () => ++count >= limit, asIs, {
    steps: Infinity,
  })
  return count
}

//one solution, the first the order finds, or null; steps caps the guesses
export const solve = (board, n, order = asIs, steps = Infinity) => {
  let solution = null
  const done = search(
    board.slice(),
    candidatesOf(board, n),
    n,
    (b) => {
      solution = b.slice()
      return true
    },
    order,
    { steps },
  )
  return done ? solution : null
}
