import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import PhoneBar from '../shell/PhoneBar'
import { phone } from '../shell/phone'
import PhoneMenu, { look } from './PhoneMenu'
import OpenGames from '../shell/OpenGames'
import { load, remove, save } from '../shell/storage'
import { records } from '../shell/records'
import { listen, shellActions, shellState, shortcut, typing } from '../shell/actions'
import { clock, loadTimer, pauseAction, seconds, timed, timerAction } from '../shell/clock'
import { check, resumable } from '../shell/resume'
import Game, { running } from './Game'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
import { allowed, fallback, levelNames } from './Menu'
import { EMPTY, emptyBoard, full, sizes, solved } from './rules'
import { levels } from './techniques'
import { completeWithErrors, findHint } from './hint'
import { deal } from './deal'
import { showRain } from '../shell/rain'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'
import { celebrate } from '../shell/fireworks'
import FireworksCanvas from '../shell/FireworksCanvas'

//the saved size and level, medium 8x8 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('takuzu.size'), 10)
  const n = sizes.includes(saved) ? saved : 8
  const level = parseInt(load('takuzu.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 1 }
  return { n, level: fallback(n, level) }
}

//an empty board until the dealer answers
export const createGame = ({ n, level }) => ({
  n,
  level,
  givens: emptyBoard(n),
  solution: null,
  board: emptyBoard(n),
  history: [],
  change: 0,
  dealing: true,
  deal: 0,
  start: -1,
  time: 0,
  raf: null,
  paused: false,
  pausedAt: 0,
  win: false,
  hinted: false,
  untimed: false,
})

//a board of -1, 0 and 1 cells for size n
const boardOf = (cells, n) => {
  check(Array.isArray(cells) && cells.length === n * n && cells.every((v) => v >= -1 && v <= 1))
  return Int8Array.from(cells)
}

//the game in progress, kept so a reload comes back to it paused
export const saved = resumable({
  key: 'takuzu.saved',
  running,
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  pack: ({ n, level, givens, solution, board, history, hinted, untimed }) => ({
    n,
    level,
    givens: Array.from(givens),
    solution: Array.from(solution),
    board: Array.from(board),
    history,
    hinted,
    untimed,
  }),
  unpack: ({ n, level, givens, solution, board, history, hinted, untimed }) => {
    check(sizes.includes(n) && level >= 0 && level < levels.length && Array.isArray(history))
    return {
      ...createGame({ n, level }),
      givens: boardOf(givens, n),
      solution: boardOf(solution, n),
      board: boardOf(board, n),
      history,
      hinted: Boolean(hinted),
      untimed: Boolean(untimed),
      dealing: false,
    }
  },
})

const { timeKey, eachSlot, actions: recordActions } = records('takuzu', sizes, levelNames)

//a click steps forward through these, a right click back
const cycle = [EMPTY, 0, 1]

//a full board with errors waits this long before asking, when its last cell may still be on its way
const ASK_AFTER = 2500

let deals = 0
let changes = 0

const prevent = (event) => {
  event.preventDefault()
  return false
}

//the clock starts on the first change or hint
const begin = (game, actions) => {
  if (game.start >= 0) return game
  game.raf = requestAnimationFrame(actions.tick)
  return { ...game, start: clock(), time: 1 }
}

//after a cell changes: a win, or a full board that is not one
//settled means another click would only empty the cell, so ask now, else ask later
const changed = (state, board, history, actions, settled = false) => {
  const next = { ...begin(state.game, actions), board, history, change: ++changes }
  next.win = solved(board, next.n)
  if (next.win) {
    cancelAnimationFrame(next.raf)
    celebrate()
    if (timed({ ...state, game: next })) actions.win(next)
  }
  const stuck = !next.win && full(board)
  if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER)
  return { hint: null, prompt: stuck && settled, game: next }
}

//tricky arrived between medium and hard on 2026-10-29, so the old times were cleared once
//and a saved hard or expert choice moved up a place to keep its name
export const upgradeLadder = () => {
  if (load('takuzu.ladder') === '5') return
  eachSlot((n, level) => {
    for (const key of [timeKey(n, level, false), timeKey(n, level, true)]) {
      remove(key)
      remove(`${key}.name`)
    }
  })
  const level = parseInt(load('takuzu.level'), 10)
  if (level >= 2) save('takuzu.level', level + 1)
  save('takuzu.ladder', '5')
}

upgradeLadder()

export const state = {
  ...shellState('takuzu'),
  hint: null,
  prompt: false,
  errors: Boolean(load('takuzu.errors')),
  timer: loadTimer('takuzu.timer'),
  rain: Boolean(load('takuzu.rain')),
  about: false,
  shelf: saved.list(),
  game: saved.restore() || createGame(loadChoice()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    listen(actions)
    showRain(state.rain)
    //a resumed game is already dealt
    if (state.game.dealing) actions.reset()
  },
  press: (event) => (state, actions) => {
    //undo is the one shortcut with a modifier
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.keyCode === 90) {
      if (typing(event) || state.boss || state.windowState !== 'open') return
      event.preventDefault()
      actions.undo()
      return
    }
    const key = shortcut(event, state, actions)
    if (key === 113 || key === 78) {
      actions.newGame()
    } else if (key === 72) {
      actions.hint()
    } else if (key === 80) {
      actions.pause()
    }
  },
  //deals a new board, keeping the size and level unless given
  reset:
    (payload) =>
    ({ game }, actions) => {
      cancelAnimationFrame(game.raf)
      const n = (payload && payload.n) || game.n
      const asked = payload && payload.level !== undefined ? payload.level : game.level
      const level = fallback(n, asked)
      save('takuzu.size', n)
      save('takuzu.level', level)
      const id = ++deals
      deal(n, level, Math.floor(Math.random() * 2 ** 32)).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        game: { ...createGame({ n, level }), deal: id },
      }
    },
  //an answer for an older deal is dropped
  dealt:
    ({ id, givens, solution }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      return { game: { ...game, givens, solution, board: givens.slice(), dealing: false } }
    },
  play:
    ({ event, i }) =>
    (state, actions) => {
      const { game } = state
      if (event.button !== 0 && event.button !== 2) return null
      if (game.dealing || game.paused || game.win || game.givens[i] !== EMPTY) return null
      const back = event.button === 2
      const from = game.board[i]
      const board = game.board.slice()
      board[i] = cycle[(cycle.indexOf(from) + (back ? 2 : 1)) % 3]
      const settled = board[i] === (back ? 0 : 1)
      return changed(state, board, [...game.history, [i, from]], actions, settled)
    },
  //the delayed question, dropped if the board changed or the game moved on meanwhile
  ask:
    (change) =>
    ({ game }) => {
      if (game.change !== change || game.win || game.paused || !full(game.board)) return null
      return { prompt: true }
    },
  undo: () => (state, actions) => {
    const { game } = state
    if (!game.history.length || game.win || game.paused || game.dealing) return { menu: null }
    const [i, from] = game.history[game.history.length - 1]
    const board = game.board.slice()
    board[i] = from
    return { menu: null, ...changed(state, board, game.history.slice(0, -1), actions) }
  },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.dealing || game.win || game.paused) return { menu: null }
      const { board, solution, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ board, solution, n }),
        game: { ...begin(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleErrors: () => (state) => {
    save('takuzu.errors', state.errors ? '' : 'yes')
    return { menu: null, errors: !state.errors }
  },
  toggleTimer: timerAction('takuzu.timer'),
  toggleRain: () => (state) => {
    save('takuzu.rain', state.rain ? '' : 'yes')
    showRain(!state.rain)
    return { menu: null, rain: !state.rain }
  },
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
  pause: pauseAction(running),
  tick:
    () =>
    ({ game }, actions) => {
      game.raf = requestAnimationFrame(actions.tick)
      const next = seconds(game.start)
      if (game.time === next) return null
      return { game: { ...game, time: next } }
    },
  ...recordActions,
  ...saved.actions,
}

export const view = (state, actions) => (
  <main
    oncontextmenu={prevent}
    ondragstart={prevent}
    oncreate={actions.init}
    onupdate={() => saved.keep(state.game)}
  >
    <FireworksCanvas key="fw" />
    <Game key="a" state={state} actions={actions} />
    {phone ? (
      <PhoneBar
        key="h"
        title={state.theme === 'classic' ? 'Takuzu' : 'Takuzu Plus'}
        page="takuzu"
        paused={state.game.paused}
        canPause={running(state.game)}
        look={look(state, actions)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="Takuzu Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Takuzu Solvers"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && <Prompt key="d" title="Takuzu" text={completeWithErrors} actions={actions} />}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.switching && <Switching key="k" title="Takuzu" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
