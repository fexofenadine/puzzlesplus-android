import { BLANK, BULB, CROSS, EMPTY, WHITE, besideOf, emptyBoard, litOf, sightsOf } from './rules'

//the plain rules run to a standstill on a board, in place: a wall with its bulbs crosses the
//cells left beside it, a wall that needs every free cell beside it fills them, and a dark cell
//only one free cell can light gets its bulb there
//false when a rule breaks; why, when given, is told what broke: { wall } or { dark }
export const settle = (layout, n, board, why) => {
  const sights = sightsOf(layout, n)
  const beside = besideOf(n)
  for (;;) {
    let changed = false
    const lit = litOf(layout, board, n)
    //a bulb put down this round lights cells at once, so later checks in the round see it
    const light = (i) => {
      board[i] = BULB
      lit[i] = 1
      for (const c of sights[i]) {
        if (board[c] === BULB) return false
        lit[c] = 1
      }
      changed = true
      return true
    }
    for (let i = 0; i < n * n; i++) {
      if (layout[i] === WHITE) {
        if (board[i] === BULB && sights[i].some((c) => board[c] === BULB)) {
          if (why) why.dark = i
          return false
        }
        continue
      }
      if (layout[i] === BLANK) continue
      let bulbs = 0
      const free = []
      for (const c of beside[i]) {
        if (layout[c] !== WHITE) continue
        if (board[c] === BULB) bulbs++
        else if (board[c] === EMPTY && !lit[c]) free.push(c)
      }
      if (bulbs > layout[i] || bulbs + free.length < layout[i]) {
        if (why) why.wall = i
        return false
      }
      if (!free.length) continue
      if (bulbs === layout[i]) {
        for (const c of free) board[c] = CROSS
        changed = true
      } else if (bulbs + free.length === layout[i]) {
        for (const c of free) {
          if (lit[c] || !light(c)) {
            if (why) why.wall = i
            return false
          }
        }
      }
    }
    for (let i = 0; i < n * n; i++) {
      if (layout[i] !== WHITE || lit[i]) continue
      let only = board[i] === EMPTY ? i : -1
      let count = only < 0 ? 0 : 1
      for (const c of sights[i]) {
        if (board[c] === EMPTY && !lit[c]) {
          only = c
          if (++count > 1) break
        }
      }
      if (!count || (count === 1 && !light(only))) {
        if (why) why.dark = i
        return false
      }
    }
    if (!changed) return true
  }
}

//a dark cell with the fewest free cells that could light it, -1 when every cell is lit
const pick = (layout, n, board) => {
  const sights = sightsOf(layout, n)
  const lit = litOf(layout, board, n)
  let best = -1
  let fewest = Infinity
  for (let i = 0; i < n * n; i++) {
    if (layout[i] !== WHITE || lit[i]) continue
    const count =
      (board[i] === EMPTY ? 1 : 0) + sights[i].filter((c) => board[c] === EMPTY && !lit[c]).length
    if (count < fewest) {
      fewest = count
      best = i
    }
  }
  return best
}

//walks the solutions, each bulb for the chosen dark cell in turn; found(board) returns true to stop
const search = (layout, n, board, found) => {
  if (!settle(layout, n, board)) return false
  const dark = pick(layout, n, board)
  if (dark < 0) return found(board)
  const sights = sightsOf(layout, n)
  const lit = litOf(layout, board, n)
  const places = [dark, ...sights[dark]].filter((c) => board[c] === EMPTY && !lit[c])
  //each place is tried with the ones before it crossed, so no solution is met twice
  const base = board.slice()
  for (const place of places) {
    const trial = base.slice()
    trial[place] = BULB
    if (search(layout, n, trial, found)) return true
    base[place] = CROSS
  }
  return false
}

//how many solutions a layout has, counting no further than limit
export const countSolutions = (layout, n, limit = 2) => {
  let count = 0
  search(layout, n, emptyBoard(n), () => ++count >= limit)
  return count
}

//a solution as 1 for a bulb and 0 elsewhere, null when there is none
export const solve = (layout, n) => {
  let solution = null
  search(layout, n, emptyBoard(n), (board) => {
    solution = Int8Array.from(board, (v) => (v === BULB ? 1 : 0))
    return true
  })
  return solution
}
