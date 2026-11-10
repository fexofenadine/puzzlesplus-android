import { load, remove, save } from './storage'

//wins, losses and streaks of a game kept as one json under <prefix>.stats
//a streak is wins in a row without help, a loss or a helped win ends it
const fields = ['won', 'lost', 'clean', 'streak', 'best']

const keyOf = (prefix) => `${prefix}.stats`

export const readStats = (prefix) => {
  let saved = null
  try {
    saved = JSON.parse(load(keyOf(prefix)))
  } catch {
    //a damaged save counts as none
  }
  return Object.fromEntries(
    fields.map((field) => [field, Math.max(0, parseInt(saved && saved[field], 10) || 0)]),
  )
}

//one finished game
export const tally = (prefix, { won, clean = true }) => {
  const stats = readStats(prefix)
  if (won) stats.won++
  else stats.lost++
  if (won && clean) {
    stats.clean++
    stats.streak++
    stats.best = Math.max(stats.best, stats.streak)
  } else {
    stats.streak = 0
  }
  save(keyOf(prefix), JSON.stringify(stats))
}

export const clearStats = (prefix) => {
  remove(keyOf(prefix))
  return readStats(prefix)
}
