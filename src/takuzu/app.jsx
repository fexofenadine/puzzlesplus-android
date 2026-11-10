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
import { tally } from '../shell/stats'
import {
  gameKey,
  historyKey,
  listen,
  prevent,
  shareAction,
  shellActions,
  shellState,
  shortcut,
  toggleAction,
} from '../shell/actions'
import {
  loadTimer,
  pauseAction,
  startClock,
  stopTick,
  tickAction,
  timerAction,
} from '../shell/clock'
import { boardOf, check, resumable } from '../shell/resume'
import Game, { running } from './Game'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
import { allowed, fallback, levelNames } from './Menu'
import { countSolutions, solve } from './solver'
import { EMPTY, emptyBoard, full, sizes, solved } from './rules'
import { levels } from './techniques'
import { completeWithErrors, findHint } from './hint'
import { deal } from './deal'
import { showRain } from '../shell/rain'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'
import { celebrate } from '../shell/fireworks'
import { DAILY_BUDGET, dayOf, finish, seedOf, special } from '../shell/daily'
import { codeOf, partsOf, sharedCode } from '../shell/share'
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
  //the steps undo took back, until the next change
  future: [],
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
  //the day of a daily puzzle, and whether the board came from a link
  daily: null,
  shared: false,
})

//the game in progress, kept so a reload comes back to it paused
export const saved = resumable({
  key: 'takuzu.saved',
  running,
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  pack: ({
    n,
    level,
    givens,
    solution,
    board,
    history,
    future,
    hinted,
    untimed,
    daily,
    shared,
  }) => ({
    n,
    level,
    givens: Array.from(givens),
    solution: Array.from(solution),
    board: Array.from(board),
    history,
    future,
    hinted,
    untimed,
    daily,
    shared,
  }),
  unpack: ({
    n,
    level,
    givens,
    solution,
    board,
    history,
    future,
    hinted,
    untimed,
    daily,
    shared,
  }) => {
    check(sizes.includes(n) && level >= 0 && level < levels.length && Array.isArray(history))
    return {
      ...createGame({ n, level }),
      givens: boardOf(givens, n, EMPTY, 1),
      solution: boardOf(solution, n, EMPTY, 1),
      board: boardOf(board, n, EMPTY, 1),
      history,
      future: Array.isArray(future) ? future : [],
      hinted: Boolean(hinted),
      untimed: Boolean(untimed),
      daily: typeof daily === 'string' ? daily : null,
      shared: Boolean(shared),
      dealing: false,
    }
  },
})

const { timeKey, eachSlot, actions: recordActions } = records('takuzu', sizes, levelNames)

//the daily puzzle's size and level
const DAILY = { n: 8, level: 1 }

//the clues as a link's code, and a game from one: null unless it is a board with one solution
const shareCode = ({ n, level, givens }) =>
  codeOf(
    n,
    level,
    Array.from(givens, (v) => v + 1),
    3,
  )

export const gameOf = (code) => {
  const parts = partsOf(code, 3, (n, level) => sizes.includes(n) && allowed(n, level))
  if (!parts) return null
  const { n, level, values } = parts
  const givens = Int8Array.from(values, (v) => v - 1)
  if (countSolutions(givens, n, 2) !== 1) return null
  const solution = solve(givens, n)
  return {
    ...createGame({ n, level }),
    givens,
    solution,
    board: givens.slice(),
    dealing: false,
    shared: true,
  }
}

const linkedGame = () => {
  const code = sharedCode()
  return code && gameOf(code)
}

//a click steps forward through these, a right click back
const cycle = [EMPTY, 0, 1]

//a full board with errors waits this long before asking, when its last cell may still be on its way
const ASK_AFTER = 2500

let deals = 0
let changes = 0

//after a cell changes: a win, or a full board that is not one
//settled means another click would only empty the cell, so ask now, else ask later
const changed = (state, board, history, actions, settled = false) => {
  const next = { ...startClock(state.game, actions), board, history, future: [], change: ++changes }
  next.win = solved(board, next.n)
  if (next.win) {
    stopTick(next.raf)
    celebrate()
    if (!state.game.win) tally('takuzu', { won: true, clean: !next.hinted })
    finish('takuzu', state, next, actions)
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

//a board from a link comes first, then the game left in progress
const opened = saved.open(linkedGame())

export const state = {
  ...shellState('takuzu'),
  hint: null,
  prompt: false,
  errors: Boolean(load('takuzu.errors')),
  timer: loadTimer('takuzu.timer'),
  rain: Boolean(load('takuzu.rain')),
  shelf: saved.list(),
  game: opened || createGame(loadChoice()),
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
    if (historyKey(event, state, actions)) return
    gameKey(shortcut(event, state, actions), actions)
  },
  //deals a new board, keeping the size and level unless given
  reset:
    (payload) =>
    ({ game }, actions) => {
      stopTick(game.raf)
      //the day's board is one size and level for everyone and leaves the saved choice alone,
      //and after it or a board from a link the next game goes back to that choice
      const day = payload && payload.daily ? dayOf() : null
      const base = day ? DAILY : special(game) ? loadChoice() : game
      const n = (payload && payload.n) || base.n
      const asked = payload && payload.level !== undefined ? payload.level : base.level
      const level = fallback(n, asked)
      const seed = day ? seedOf(day, 'takuzu') : Math.floor(Math.random() * 2 ** 32)
      if (!day) {
        save('takuzu.size', n)
        save('takuzu.level', level)
      }
      const id = ++deals
      deal(n, level, seed, day ? DAILY_BUDGET : undefined).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        game: { ...createGame({ n, level }), deal: id, daily: day },
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
    const [i, from] = game.history.at(-1)
    const board = game.board.slice()
    board[i] = from
    const next = changed(state, board, game.history.slice(0, -1), actions)
    next.game.future = [...game.future, [i, game.board[i]]]
    return { menu: null, ...next }
  },
  //puts back what undo took, until something else changes
  redo: () => (state, actions) => {
    const { game } = state
    if (!game.future.length || game.win || game.paused || game.dealing) return { menu: null }
    const [i, to] = game.future.at(-1)
    const board = game.board.slice()
    board[i] = to
    const next = changed(state, board, [...game.history, [i, game.board[i]]], actions)
    next.game.future = game.future.slice(0, -1)
    return { menu: null, ...next }
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
        game: { ...startClock(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleErrors: toggleAction('errors', 'takuzu.errors', 'yes'),
  toggleTimer: timerAction('takuzu.timer'),
  toggleRain: () => (state) => {
    save('takuzu.rain', state.rain ? '' : 'yes')
    showRain(!state.rain)
    return { menu: null, rain: !state.rain }
  },
  share: shareAction(shareCode),
  pause: pauseAction(running),
  tick: tickAction,
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
