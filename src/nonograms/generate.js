import { random } from '../shell/random'
import { EMPTY, cluesOf, emptyBoard } from './rules'
import { deduce } from './solver'
import { levels, rate, solveAt } from './techniques'

export { random }

//edges touched, and no empty line at all up to 10x10
export const filled = (cells, n) => {
  const used = (line) => line.some((k) => cells[k])
  const rows = [...Array(n).keys()].map((y) => [...Array(n).keys()].map((x) => y * n + x))
  const columns = [...Array(n).keys()].map((x) => [...Array(n).keys()].map((y) => y * n + x))
  const lines = n <= 10 ? [...rows, ...columns] : [rows[0], rows[n - 1], columns[0], columns[n - 1]]
  return lines.every(used)
}

//the same left to right
export const mirrored = (cells, n) => {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n / 2; x++) if (cells[y * n + x] !== cells[y * n + n - 1 - x]) return false
  }
  return true
}

//the cell on the other side of the mirror
const twin = (i, n) => i - (i % n) + n - 1 - (i % n)

//a grid that fills its space and is symmetric or not, as asked
const shaped = (cells, n, symmetric) => filled(cells, n) && mirrored(cells, n) === symmetric

//a random picture: noise smoothed into blobs, mirrored when symmetric
//non-symmetric ones that come out symmetric are dealt again
//5x5 is too small to smooth, dense suits easy boards
export const makePicture = (n, rng, dense = 0, symmetric = true) => {
  for (;;) {
    const cells = scatter(n, rng, dense, symmetric)
    if (shaped(cells, n, symmetric)) return cells
  }
}

const scatter = (n, rng, dense, symmetric) => {
  const density = 0.48 + dense + 0.08 * rng()
  let cells = Int8Array.from({ length: n * n }, () => (rng() < density ? 1 : 0))
  for (let pass = 0; pass < (n < 10 ? 0 : 2); pass++) {
    const next = cells.slice()
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let count = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy
            const xx = x + dx
            if (yy >= 0 && yy < n && xx >= 0 && xx < n) count += cells[yy * n + xx]
          }
        }
        //a clear majority of the neighbourhood wins, a close call keeps the cell
        if (count >= 6) next[y * n + x] = 1
        else if (count <= 3) next[y * n + x] = 0
      }
    }
    cells = next
  }
  if (symmetric) {
    for (let y = 0; y < n; y++) {
      for (let x = Math.ceil(n / 2); x < n; x++) cells[y * n + x] = cells[y * n + n - 1 - x]
    }
  }
  return cells
}

//a picture the techniques up to top can finish, which also proves it unique
//unsettled cells get flipped, a new picture after too many flips, null at the deadline
//what-if waits until lines leave a quarter or less open
export const makePuzzle = (
  n,
  rng,
  top = levels.length - 1,
  deadline = Infinity,
  symmetric = true,
) => {
  while (performance.now() < deadline) {
    const solution = makePicture(n, rng, top ? 0 : 0.12, symmetric)
    for (let flips = 0; flips < 4 * n && performance.now() < deadline; flips++) {
      const clues = cluesOf(solution, n)
      const board = emptyBoard(n)
      if (solveAt(board, n, clues, Math.min(top, 2))) {
        return { solution, clues, level: rate(clues, n, Math.min(top, 2)) }
      }
      //lines alone got stuck, so a board what-if finishes is expert by definition
      const open = board.filter((v) => v === EMPTY).length
      if (top >= 3 && open * 4 <= n * n && deduce(board, n, clues, true, deadline) !== null) {
        return { solution, clues, level: 3 }
      }
      const unsettled = [...board.keys()].filter((i) => board[i] === EMPTY)
      const flip = unsettled[Math.floor(rng() * unsettled.length)]
      const cells = symmetric ? [flip, twin(flip, n)] : [flip]
      for (const k of cells) solution[k] ^= 1
      //take back a flip that spoils the picture
      if (!shaped(solution, n, symmetric)) for (const k of cells) solution[k] ^= 1
    }
  }
  return null
}

//a puzzle that needs exactly level, within a time budget, longer for the biggest boards
//falls back to the hardest board found when time runs out, or a quick medium one if none was
export const makeGame = (n, level, rng, budget = n >= 20 ? 3000 : 1500, symmetric = true) => {
  const deadline = performance.now() + budget
  let best = null
  for (;;) {
    const puzzle = makePuzzle(n, rng, level, deadline, symmetric)
    if (!puzzle) break
    if (puzzle.level === level) return puzzle
    if (!best || puzzle.level > best.level) best = puzzle
  }
  return best ?? makePuzzle(n, rng, 1, Infinity, symmetric)
}
