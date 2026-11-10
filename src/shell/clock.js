import { load, save } from './storage'

//the clock grows a fourth digit past 999, except on classic which stops there like the original
export const clockDigits = (theme, time) => (theme !== 'classic' && time > 999 ? 4 : 3)

//milliseconds since 1970, so a game resumed on a fresh page never starts below zero
export const clock = () => performance.timeOrigin + performance.now()

//the clock's shown seconds for a game started at start
export const seconds = (start) => Math.floor((clock() - start) / 1000) + 1

//wakes the clock as its next second begins, a timer where every frame used to look
export const nextTick = (tick, start = clock()) =>
  setTimeout(tick, 1000 - ((clock() - start) % 1000) + 4)

export const stopTick = (id) => clearTimeout(id)

//pausing stops the clock and hides the board, only while running(game) holds
//onPause adds the game's own changes, like dropping a half done click
export const pauseAction =
  (running, onPause = () => ({})) =>
  (paused) =>
  ({ game }, actions) => {
    const next = paused === undefined ? !game.paused : paused
    if (!running(game) || next === game.paused) return null
    if (!next) {
      const start = game.start + clock() - game.pausedAt
      game.raf = nextTick(actions.tick, start)
      return { game: { ...game, paused: false, start } }
    }
    stopTick(game.raf)
    return {
      menu: null,
      game: { ...game, ...onPause(game, actions), paused: true, pausedAt: clock() },
    }
  }

//the clock starts on a game's first change or hint
export const startClock = (game, actions) => {
  if (game.start >= 0) return game
  game.raf = nextTick(actions.tick)
  return { ...game, start: clock(), time: 1 }
}

//once a second, the window only draws when the shown second changes
export const tickAction =
  () =>
  ({ game }, actions) => {
    game.raf = nextTick(actions.tick, game.start)
    const next = seconds(game.start)
    if (game.time === next) return null
    return { game: { ...game, time: next } }
  }

//the timer option: off shows dashes and keeps the game out of the best times
//a game that had the timer off at any point stays out even if it comes back on
//on and off are what is saved, so a game can default either way
export const timerAction =
  (key, on = '', off = 'off') =>
  () =>
  ({ timer, game }) => {
    save(key, timer ? off : on)
    return { menu: null, timer: !timer, game: timer ? { ...game, untimed: true } : game }
  }

export const loadTimer = (key) => load(key) !== 'off'

//a win counts for best times only while timed
export const timed = ({ timer, game }) => timer && !game.untimed
