import { load, remove, save } from './storage'

//wins, losses and streaks of a game kept as one json under <prefix>.stats
//a streak is wins in a row without help, a loss or a helped win ends it
//timed holds the wins that count towards the average (timed, without help) and total their seconds
//levels is the same by board, as label: [wins, seconds]
const fields = ['won', 'lost', 'clean', 'streak', 'best', 'timed', 'total']

const keyOf = (prefix) => `${prefix}.stats`

export const readStats = (prefix) => {
  let saved = null
  try {
    saved = JSON.parse(load(keyOf(prefix)))
  } catch {
    //a damaged save counts as none
  }
  const stats = Object.fromEntries(
    fields.map((field) => [field, Math.max(0, parseInt(saved && saved[field], 10) || 0)]),
  )
  stats.levels = {}
  const found = saved && saved.levels
  if (found && typeof found === 'object') {
    for (const [name, pair] of Object.entries(found)) {
      const [wins, seconds] = Array.isArray(pair) ? pair.map((v) => parseInt(v, 10)) : []
      if (wins >= 0 && seconds >= 0) stats.levels[name] = [wins, seconds]
    }
  }
  return stats
}

//the seconds a win counts for the average: none when untimed, helped or from a link
export const timeOf = (timer, game) =>
  timer && !game.untimed && !game.hinted && !game.shared && game.time > 0 ? game.time : 0

//the average of total over count, in seconds, 0 when there is none
export const average = (total, count) => (count ? Math.round(total / count) : 0)

//a time as m:ss, or h:mm:ss from an hour
export const clockText = (seconds) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const sec = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

//losses are only counted, and shown, once switched on (Minesweeper and 2048 can be lost)
export const lossesOn = () => load('losses') === 'on'

export const lossState = () => ({ trackLosses: lossesOn() })

export const lossActions = {
  toggleTrackLosses:
    () =>
    ({ trackLosses }) => {
      save('losses', trackLosses ? 'off' : 'on')
      return { menu: null, trackLosses: !trackLosses }
    },
}

//one finished game, a loss is skipped while they are not tracked
export const tally = (prefix, { won, clean = true, time = 0, level = '' }) => {
  if (!won && !lossesOn()) return
  const stats = readStats(prefix)
  if (won) stats.won++
  else stats.lost++
  if (won && clean) {
    stats.clean++
    stats.streak++
    stats.best = Math.max(stats.best, stats.streak)
    if (time > 0) {
      stats.timed++
      stats.total += time
      if (level) {
        const [wins, seconds] = stats.levels[level] || [0, 0]
        stats.levels[level] = [wins + 1, seconds + time]
      }
    }
  } else {
    stats.streak = 0
  }
  save(keyOf(prefix), JSON.stringify(stats))
}

export const clearStats = (prefix) => {
  remove(keyOf(prefix))
  return readStats(prefix)
}
