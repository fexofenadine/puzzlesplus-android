import { arrows, directions, empties, highest, slide } from './rules'

//how promising a board looks: free cells, rows and columns that run one way, neighbours close in
//value, and the biggest tile in a corner, the usual advice made into numbers
export const score = (values, n) => {
  const logs = values.map((v) => (v ? Math.log2(v) : 0))
  let free = 0
  let smooth = 0
  let mono = 0
  for (const v of values) if (!v) free++
  for (let a = 0; a < n; a++) {
    let up = 0
    let down = 0
    let left = 0
    let right = 0
    for (let b = 0; b + 1 < n; b++) {
      const [r1, r2] = [logs[a * n + b], logs[a * n + b + 1]]
      const [c1, c2] = [logs[b * n + a], logs[(b + 1) * n + a]]
      if (r1 > r2) left += r1 - r2
      else right += r2 - r1
      if (c1 > c2) up += c1 - c2
      else down += c2 - c1
      if (r1 && r2) smooth -= Math.abs(r1 - r2)
      if (c1 && c2) smooth -= Math.abs(c1 - c2)
    }
    mono -= Math.min(left, right) + Math.min(up, down)
  }
  const top = Math.max(...logs)
  const corners = [0, n - 1, n * (n - 1), n * n - 1]
  const cornered = corners.some((c) => logs[c] === top) ? top : 0
  return free * 2.7 + mono * 1.5 + smooth * 0.15 + cornered * 1.2
}

//the most cells a chance node looks at, so big boards stay quick
const SAMPLE = 6

//the expected score after a random tile lands, then the best move, depth moves deep
const chance = (values, n, depth) => {
  const free = empties(values)
  if (!free.length) return score(values, n)
  const step = Math.max(1, Math.floor(free.length / SAMPLE))
  let total = 0
  let count = 0
  for (let k = 0; k < free.length; k += step) {
    const c = free[k]
    for (const [v, p] of [
      [2, 0.9],
      [4, 0.1],
    ]) {
      const next = values.slice()
      next[c] = v
      total += p * best(next, n, depth)
    }
    count++
  }
  return total / count
}

//the best value a move can reach, or a heavy penalty when none is left
const best = (values, n, depth) => {
  if (depth === 0) return score(values, n)
  let top = -1e9
  for (const dir of directions) {
    const { values: next, moved } = slide(values, n, dir)
    if (moved) top = Math.max(top, chance(next, n, depth - 1))
  }
  return top
}

//each legal move with its expected value, best first
export const rank = (values, n, depth = 2) =>
  directions
    .map((dir) => ({ dir, ...slide(values, n, dir) }))
    .filter((m) => m.moved)
    .map((m) => ({ ...m, value: chance(m.values, n, depth - 1) }))
    .sort((a, b) => b.value - a.value)

const corners = (n) => [0, n - 1, n * (n - 1), n * n - 1]

const inCorner = (values, n) => corners(n).some((c) => values[c] === highest(values))

//a 16 but an 8 or an 8192
const a = (value) => (String(value).startsWith('8') ? 'an' : 'a')

const capital = (text) => text[0].toUpperCase() + text.slice(1)

//a list in words: a, b and c
const listOf = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

//the move the search likes best and why, in words, or null when no move is left
//{ dir, text }
export const suggest = (values, n) => {
  const ranked = rank(values, n)
  if (!ranked.length) return null
  const [pick, ...others] = ranked
  const top = highest(values)
  const reasons = []
  if (pick.merges.length) {
    const biggest = Math.max(...pick.merges)
    const count = pick.merges.length
    reasons.push(
      count === 1
        ? `makes ${a(biggest)} ${biggest}`
        : `makes ${count} merges, the biggest ${a(biggest)} ${biggest}`,
    )
  }
  const cornered = inCorner(values, n)
  if (cornered && inCorner(pick.values, n)) reasons.push(`keeps your ${top} in its corner`)
  else if (!cornered && inCorner(pick.values, n)) reasons.push(`moves your ${top} into a corner`)
  const free = empties(pick.values).length
  reasons.push(`leaves ${free} cell${free === 1 ? '' : 's'} free`)
  let text = `${arrows[pick.dir]} ${capital(pick.dir)}: it ${listOf(reasons)}.`
  if (cornered && others.length && others.every((m) => !inCorner(m.values, n))) {
    text += ` Every other move would pull your ${top} out of its corner.`
  } else if (!others.length) {
    text += ' It is the only move left.'
  }
  return { dir: pick.dir, text }
}
