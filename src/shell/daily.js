import { load, remove, save } from './storage'

//the daily puzzle: one board a day per game, the same for everyone, with a streak of days solved
//kept as one json under <prefix>.daily: { last, streak, best, time, fastest }

//a daily deal searches this long, so every device ends on the same board
export const DAILY_BUDGET = 15000

const pad = (value) => String(value).padStart(2, '0')

//the player's own calendar day, as 2026-11-11
export const dayOf = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const dayBefore = (day) => {
  const [year, month, date] = day.split('-').map(Number)
  return dayOf(new Date(year, month - 1, date - 1))
}

//the day's seed for one game, an fnv hash of both so neighbouring days share nothing
export const seedOf = (day, prefix) => {
  let hash = 2166136261
  for (const letter of `${prefix} ${day}`) {
    hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619)
  }
  return hash >>> 0
}

const keyOf = (prefix) => `${prefix}.daily`

const read = (prefix) => {
  let saved = null
  try {
    saved = JSON.parse(load(keyOf(prefix)))
  } catch {
    //a damaged save counts as none
  }
  const count = (value) => Math.max(0, parseInt(value, 10) || 0)
  return {
    last: saved && /^\d{4}-\d\d-\d\d$/.test(saved.last) ? saved.last : '',
    streak: count(saved && saved.streak),
    best: count(saved && saved.best),
    time: count(saved && saved.time),
    fastest: count(saved && saved.fastest),
  }
}

//what the best times dialog shows: a streak only stands while yesterday or today was solved
export const readDaily = (prefix, today = dayOf()) => {
  const { last, streak, best, time, fastest } = read(prefix)
  const done = last === today
  const alive = done || last === dayBefore(today)
  return { done, time: done ? time : 0, streak: alive ? streak : 0, best, fastest }
}

//a day's puzzle solved, counted once; time is 0 for a solve with hints or the timer off
export const solveDaily = (prefix, day, time = 0) => {
  const { last, streak, best, fastest } = read(prefix)
  if (last >= day) return
  const next = last === dayBefore(day) ? streak + 1 : 1
  save(
    keyOf(prefix),
    JSON.stringify({
      last: day,
      streak: next,
      best: Math.max(best, next),
      time,
      fastest: time && (!fastest || time < fastest) ? time : fastest,
    }),
  )
}

export const clearDaily = (prefix) => {
  remove(keyOf(prefix))
  return readDaily(prefix)
}

//the board a game goes back to after a daily or shared one, which never become the saved choice
export const special = (game) => Boolean(game.daily || game.shared)

//a won game's records: the day for a daily puzzle, nothing for a board from a link, else the
//game's own best times through record, which defaults to the win action
export const finish = (prefix, state, game, actions, record = (won) => actions.win(won)) => {
  const counts = state.timer && !game.untimed
  if (game.daily) {
    solveDaily(prefix, game.daily, counts && !game.hinted ? game.time : 0)
    actions.toggleBestTime()
  } else if (counts && !game.shared) {
    record(game, actions)
  }
}
