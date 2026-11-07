import { load, save } from './storage'

//the clock grows a fourth digit past 999, except on classic which stops there like the original
export const clockDigits = (theme, time) => (theme !== 'classic' && time > 999 ? 4 : 3)

//milliseconds since 1970, so a game resumed on a fresh page never starts below zero
export const clock = () => performance.timeOrigin + performance.now()

//the clock's shown seconds for a game started at start
export const seconds = (start) => Math.floor((clock() - start) / 1000) + 1

//pausing stops the clock and hides the board, only while running(game) holds
//onPause adds the game's own changes, like dropping a half done click
export const pauseAction =
  (running, onPause = () => ({})) =>
  (paused) =>
  ({ game }, actions) => {
    const next = paused === undefined ? !game.paused : paused
    if (!running(game) || next === game.paused) return null
    if (!next) {
      game.raf = requestAnimationFrame(actions.tick)
      return {
        game: { ...game, paused: false, start: game.start + clock() - game.pausedAt },
      }
    }
    cancelAnimationFrame(game.raf)
    return {
      menu: null,
      game: { ...game, ...onPause(game, actions), paused: true, pausedAt: clock() },
    }
  }

//the timer option: off shows dashes and keeps the game out of the best times
//a game that had the timer off at any point stays out even if it comes back on
export const timerAction =
  (key) =>
  () =>
  ({ timer, game }) => {
    save(key, timer ? 'off' : '')
    return { menu: null, timer: !timer, game: timer ? { ...game, untimed: true } : game }
  }

export const loadTimer = (key) => load(key) !== 'off'

//a win counts for best times only while timed
export const timed = ({ timer, game }) => timer && !game.untimed
