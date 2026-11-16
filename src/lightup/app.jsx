import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import OpenGames from '../shell/OpenGames'
import { load, save } from '../shell/storage'
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
import { BULB, CROSS, EMPTY, WHITE, darkLeft, emptyBoard, sizes, solved } from './rules'
import { completeWithErrors, findHint } from './hint'
import { deal } from './deal'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'
import { celebrate, stopFireworks } from '../shell/fireworks'
import { arrows, stepCursor } from '../shell/cursor'
import { DAILY_BUDGET, dayOf, finish, seedOf, special } from '../shell/daily'
import { codeOf, partsOf, sharedCode } from '../shell/share'
import FireworksCanvas from '../shell/FireworksCanvas'
import PhoneBar from '../shell/PhoneBar'
import { phone } from '../shell/phone'
import PhoneMenu from './PhoneMenu'

//the saved size and level, easy 7x7 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('lightup.size'), 10)
  const n = sizes.includes(saved) ? saved : 7
  const level = parseInt(load('lightup.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 0 }
  return { n, level: fallback(n, level) }
}

//an empty board until the dealer answers
export const createGame = ({ n, level }) => ({
  n,
  level,
  //all white until the dealer answers
  layout: new Int8Array(n * n).fill(WHITE),
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
  key: 'lightup.saved',
  running,
  fresh: { cursor: -1 },
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  pack: ({
    n,
    level,
    layout,
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
    layout: Array.from(layout),
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
    layout,
    solution,
    board,
    history,
    future,
    hinted,
    untimed,
    daily,
    shared,
  }) => {
    check(sizes.includes(n) && allowed(n, level) && Array.isArray(history))
    return {
      ...createGame({ n, level }),
      layout: boardOf(layout, n, WHITE, 5),
      solution: boardOf(solution, n, 0, 1),
      board: boardOf(board, n, EMPTY, BULB),
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

const { actions: recordActions } = records('lightup', sizes, levelNames)

//the daily puzzle's size and level
const DAILY = { n: 10, level: 1 }

//the walls as a link's code, and a game from one: null unless it is a board with one solution
const shareCode = ({ n, level, layout }) =>
  codeOf(
    n,
    level,
    Array.from(layout, (v) => v + 1),
    7,
  )

export const gameOf = (code) => {
  const parts = partsOf(code, 7, (n, level) => sizes.includes(n) && allowed(n, level))
  if (!parts) return null
  const { n, level, values } = parts
  const layout = Int8Array.from(values, (v) => v - 1)
  if (!layout.includes(WHITE) || countSolutions(layout, n, 2) !== 1) return null
  return {
    ...createGame({ n, level }),
    layout,
    solution: solve(layout, n),
    dealing: false,
    shared: true,
  }
}

const linkedGame = () => {
  const code = sharedCode()
  return code && gameOf(code)
}

//a click steps forward through these, a right click back
const cycle = [EMPTY, BULB, CROSS]

//a lit board with errors waits this long before asking, when its last bulb may be on its way to a cross
const ASK_AFTER = 2500

let deals = 0
let changes = 0

//after a cell changes: a win, or a board all lit that is not one
//settled means the change was meant as it stands, so ask now, else ask later
const changed = (state, board, history, actions, settled = false) => {
  const next = { ...startClock(state.game, actions), board, history, future: [], change: ++changes }
  next.win = solved(next.layout, board, next.n)
  if (next.win) {
    stopTick(next.raf)
    celebrate()
    if (!state.game.win) tally('lightup', { won: true, clean: !next.hinted })
    finish('lightup', state, next, actions)
  }
  const stuck = !next.win && darkLeft(next.layout, board, next.n) === 0
  if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER)
  return { hint: null, prompt: stuck && settled, game: next }
}

//a mark onto a white cell, null when nothing changes
const place = (state, actions, i, to, settled) => {
  const { game } = state
  if (game.dealing || game.paused || game.win || game.layout[i] !== WHITE) return null
  const from = game.board[i]
  if (from === to) return null
  const board = game.board.slice()
  board[i] = to
  return changed(state, board, [...game.history, [i, from]], actions, settled)
}

//a board from a link comes first, then the game left in progress
const opened = saved.open(linkedGame())

export const state = {
  ...shellState('lightup'),
  hint: null,
  prompt: false,
  //the cell the arrow keys are on, -1 until they are used and again after a click
  cursor: -1,
  errors: Boolean(load('lightup.errors')),
  //numbered walls show the bulbs they still need, on unless switched off
  countdown: load('lightup.countdown') !== 'off',
  timer: loadTimer('lightup.timer'),
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
    //a resumed game is already dealt
    if (state.game.dealing) actions.reset()
  },
  //arrows move a cursor, space steps its cell like a click, b and x mark it, backspace clears it
  press: (event) => (state, actions) => {
    if (historyKey(event, state, actions)) return
    const key = shortcut(event, state, actions)
    if (key === null || gameKey(key, actions)) return
    const typed = { 66: BULB, 88: CROSS, 8: EMPTY, 46: EMPTY, 32: 'next' }[key]
    if (arrows[key]) actions.move(arrows[key])
    else if (typed !== undefined) actions.type(typed)
    else return
    event.preventDefault()
  },
  //deals a new board, keeping the size and level unless given
  reset:
    (payload) =>
    ({ game }, actions) => {
      stopTick(game.raf)
      stopFireworks()
      //the day's board is one size and level for everyone and leaves the saved choice alone,
      //and after it or a board from a link the next game goes back to that choice
      const day = payload && payload.daily ? dayOf() : null
      const base = day ? DAILY : special(game) ? loadChoice() : game
      const n = (payload && payload.n) || base.n
      const asked = payload && payload.level !== undefined ? payload.level : base.level
      const level = fallback(n, asked)
      const seed = day ? seedOf(day, 'lightup') : Math.floor(Math.random() * 2 ** 32)
      if (!day) {
        save('lightup.size', n)
        save('lightup.level', level)
      }
      const id = ++deals
      deal(n, level, seed, day ? DAILY_BUDGET : undefined).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        cursor: -1,
        game: { ...createGame({ n, level }), deal: id, daily: day },
      }
    },
  //an answer for an older deal is dropped
  dealt:
    ({ id, layout, solution }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      return { game: { ...game, layout, solution, dealing: false } }
    },
  play:
    ({ event, i }) =>
    (state, actions) => {
      if (event.button !== 0 && event.button !== 2) return null
      const back = event.button === 2
      const to = cycle[(cycle.indexOf(state.game.board[i]) + (back ? 2 : 1)) % 3]
      //the pointer takes over from the keyboard's cursor; a bulb may be on its way to a cross
      return { cursor: -1, ...place(state, actions, i, to, to !== BULB) }
    },
  move:
    (step) =>
    ({ game, cursor }) => {
      if (game.dealing || game.paused || game.win) return null
      return { cursor: stepCursor(cursor, step, game.n) }
    },
  //a key on the cursor's cell: next steps it on like a click, a mark typed on itself clears it
  type: (to) => (state, actions) => {
    const { game, cursor } = state
    if (cursor < 0) return null
    const from = game.board[cursor]
    const next = cycle[(cycle.indexOf(from) + 1) % 3]
    return to === 'next'
      ? place(state, actions, cursor, next, next !== BULB)
      : place(state, actions, cursor, to === from ? EMPTY : to, true)
  },
  //the delayed question, dropped if the board changed or the game moved on meanwhile
  ask:
    (change) =>
    ({ game }) => {
      if (game.change !== change || game.win || game.paused) return null
      if (darkLeft(game.layout, game.board, game.n)) return null
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
      const { layout, board, solution, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ layout, board, solution, n }),
        game: { ...startClock(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleErrors: toggleAction('errors', 'lightup.errors', 'yes'),
  toggleCountdown: toggleAction('countdown', 'lightup.countdown', '', 'off'),
  toggleTimer: timerAction('lightup.timer'),
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
        title={state.theme === 'classic' ? 'Light Up' : 'Light Up Plus'}
        page="lightup"
        paused={state.game.paused}
        canPause={running(state.game)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="Light Up Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Light Up Solvers"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && (
      <Prompt key="d" title="Light Up" text={completeWithErrors} actions={actions} />
    )}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.switching && <Switching key="k" title="Light Up" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
