//a keyboard cursor on a square board, for games played with the arrow keys
import { keys } from './keys'

//the step each arrow key takes, by key code
export const arrows = {
  [keys.left]: [-1, 0],
  [keys.up]: [0, -1],
  [keys.right]: [1, 0],
  [keys.down]: [0, 1],
}

//the cell a step from the cursor on an n x n board: the middle when there is none yet, and the
//cursor stays where it is at an edge
export const stepCursor = (cursor, [dx, dy], n) => {
  if (cursor < 0) return Math.floor(n / 2) * (n + 1)
  const x = (cursor % n) + dx
  const y = Math.floor(cursor / n) + dy
  return x < 0 || y < 0 || x >= n || y >= n ? cursor : y * n + x
}
