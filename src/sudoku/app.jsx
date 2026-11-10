import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import PhoneBar from '../shell/PhoneBar'
import { phone } from '../shell/phone'
import PhoneMenu from './PhoneMenu'
import OpenGames from '../shell/OpenGames'
import { load, save } from '../shell/storage'
import { records } from '../shell/records'
import { tally } from '../shell/stats'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
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
import { celebrate } from '../shell/fireworks'
import { DAILY_BUDGET, dayOf, finish, seedOf, special } from '../shell/daily'
import { codeOf, partsOf, sharedCode } from '../shell/share'
import FireworksCanvas from '../shell/FireworksCanvas'
import {
  EMPTY,
  bit,
  boxShapes,
  breaks,
  candidatesOf,
  emptyBoard,
  full,
  geometry,
  sizes,
  solved,
} from './rules'
import { countSolutions, solve } from './solver'
import { levels } from './techniques'
import { deal } from './deal'
import { completeWithErrors, findHint } from './hint'
import { allowed, fallback, levelNames } from './Menu'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'

//the saved size and level, easy 9x9 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('sudoku.size'), 10)
  const n = sizes.includes(saved) ? saved : 9
  const level = parseInt(load('sudoku.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 0 }
  return { n, level: fallback(n, level) }
}

//an empty board until the dealer answers
//notes are candidate masks per cell, history a list of steps of [cell, digit, notes] as they were
export const createGame = ({ n, level }) => ({
  n,
  level,
  givens: emptyBoard(n),
  solution: null,
  board: emptyBoard(n),
  notes: new Int32Array(n * n),
  history: [],
  //the steps undo took back, until the next change
  future: [],
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
  key: 'sudoku.saved',
  running,
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  fresh: { selected: -1, picked: 0 },
  pack: ({
    n,
    level,
    givens,
    solution,
    board,
    notes,
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
    notes: Array.from(notes),
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
    notes,
    history,
    future,
    hinted,
    untimed,
    daily,
    shared,
  }) => {
    check(sizes.includes(n) && boxShapes[n] && level >= 0 && level < levels.length)
    check(Array.isArray(notes) && notes.length === n * n && Array.isArray(history))
    return {
      ...createGame({ n, level }),
      givens: boardOf(givens, n, EMPTY, n),
      solution: boardOf(solution, n, EMPTY, n),
      board: boardOf(board, n, EMPTY, n),
      notes: Int32Array.from(notes),
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

const { actions: recordActions } = records('sudoku', sizes, levelNames)

//the daily puzzle's size and level
const DAILY = { n: 9, level: 1 }

//the clues as a link's code, and a game from one: null unless it is a board with one solution
const shareCode = ({ n, level, givens }) => codeOf(n, level, givens, n + 1)

export const gameOf = (code) => {
  //the digits are packed in the size's own base, so the size is read first
  const base = Number(code.split('.')[0]) + 1
  const parts = partsOf(code, base, (n, level) => sizes.includes(n) && allowed(n, level))
  if (!parts) return null
  const { n, level, values } = parts
  const givens = Int8Array.from(values)
  if (breaks(givens, n).length || countSolutions(givens, n, 2) !== 1) return null
  return {
    ...createGame({ n, level }),
    givens,
    solution: solve(givens, n),
    board: givens.slice(),
    dealing: false,
    shared: true,
  }
}

const linkedGame = () => {
  const code = sharedCode()
  return code && gameOf(code)
}

let deals = 0

//a cell the player may change
const editable = (game, i) => i >= 0 && game.givens[i] === EMPTY

//whether the game takes moves at all
const playable = (game) => !game.dealing && !game.paused && !game.win

//after a change: a win stops the clock, a full board that isn't one asks about a hint
const changed = (state, board, notes, history, actions) => {
  const next = { ...startClock(state.game, actions), board, notes, history, future: [] }
  next.win = solved(board, next.n)
  if (next.win) {
    stopTick(next.raf)
    celebrate()
    if (!state.game.win) tally('sudoku', { won: true, clean: !next.hinted })
    finish('sudoku', state, next, actions)
  }
  return { hint: null, prompt: !next.win && full(board), game: next }
}

//cell changes as one undo step: the digit and notes each cell gets, and what it had before
const edit = (state, actions, changes) => {
  const { game } = state
  const board = game.board.slice()
  const notes = game.notes.slice()
  const step = []
  for (const [i, digit, mask] of changes) {
    if (board[i] === digit && notes[i] === mask) continue
    step.push([i, board[i], notes[i]])
    board[i] = digit
    notes[i] = mask
  }
  if (!step.length) return null
  return changed(state, board, notes, [...game.history, step], actions)
}

//a digit into a cell, or out again when it is already there
//tidy notes takes the digit out of the notes of every cell it rules out
const placeDigit = (state, actions, i, d) => {
  const { game, tidy } = state
  if (game.board[i] === d) return edit(state, actions, [[i, EMPTY, game.notes[i]]])
  const changes = [[i, d, game.notes[i]]]
  if (tidy) {
    for (const p of geometry(game.n).peers[i]) {
      if (game.notes[p] & bit(d)) changes.push([p, game.board[p], game.notes[p] & ~bit(d)])
    }
  }
  return edit(state, actions, changes)
}

//a note on or off, only in an empty cell
const toggleNote = (state, actions, i, d) => {
  const { game } = state
  if (game.board[i] !== EMPTY) return null
  return edit(state, actions, [[i, EMPTY, game.notes[i] ^ bit(d)]])
}

const enter = (state, actions, i, d, note) =>
  note ? toggleNote(state, actions, i, d) : placeDigit(state, actions, i, d)

//the digit a key stands for, 1 to 9 on the main keys or the number pad, 0 for zero
const digitOf = (event) => {
  const { keyCode } = event
  if (keyCode >= 48 && keyCode <= 57) return keyCode - 48
  if (keyCode >= 96 && keyCode <= 105) return keyCode - 96
  return -1
}

const arrows = { 37: [-1, 0], 38: [0, -1], 39: [1, 0], 40: [0, 1] }

//a board from a link comes first, then the game left in progress
const opened = saved.open(linkedGame())

export const state = {
  ...shellState('sudoku'),
  hint: null,
  prompt: false,
  errors: Boolean(load('sudoku.errors')),
  tidy: load('sudoku.tidy') !== 'off',
  timer: loadTimer('sudoku.timer'),
  //the selected cell, or -1; the digit picked on the pad for tapping cells, or 0
  selected: -1,
  picked: 0,
  //pad digits and typed ones are notes while this is on
  noting: false,
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
  press: (event) => (state, actions) => {
    if (historyKey(event, state, actions)) return
    const key = shortcut(event, state, actions)
    if (key === null) return
    const digit = digitOf(event)
    if (gameKey(key, actions)) return
    if (arrows[key]) {
      event.preventDefault()
      actions.move(arrows[key])
    } else if (key === 32) {
      event.preventDefault()
      actions.toggleNoting()
    } else if (key === 8 || key === 46 || digit === 0) {
      event.preventDefault()
      actions.erase()
    } else if (digit > 0 && digit <= state.game.n) {
      actions.pad({ d: digit, note: event.shiftKey })
    }
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
      const seed = day ? seedOf(day, 'sudoku') : Math.floor(Math.random() * 2 ** 32)
      if (!day) {
        save('sudoku.size', n)
        save('sudoku.level', level)
      }
      const id = ++deals
      deal(n, level, seed, day ? DAILY_BUDGET : undefined).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        selected: -1,
        picked: 0,
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
  //a tap on a cell: with a digit picked it goes in (a right click makes it a note), otherwise
  //the cell is selected, or unselected when it already was
  tap:
    ({ event, i }) =>
    (state, actions) => {
      const { game, picked, selected } = state
      if (event.button !== 0 && event.button !== 2) return null
      if (!playable(game)) return null
      if (picked && editable(game, i)) {
        return enter(state, actions, i, picked, state.noting || event.button === 2)
      }
      return { selected: selected === i && !picked ? -1 : i, picked: 0 }
    },
  //a pad digit or a typed one goes into the selected cell; with nothing to fill it is picked
  //for tapping cells instead, and picking it again puts it down
  pad:
    ({ d, note = false }) =>
    (state, actions) => {
      const { game, selected, picked } = state
      if (!playable(game)) return null
      if (editable(game, selected)) {
        return enter(state, actions, selected, d, note || state.noting)
      }
      return { selected: -1, picked: picked === d ? 0 : d }
    },
  //the arrows move the selection, from the centre when there is none
  move:
    ([dx, dy]) =>
    ({ game, selected }) => {
      if (!playable(game)) return null
      const { n } = game
      if (selected < 0) return { selected: Math.floor((n * n) / 2), picked: 0 }
      const x = (selected % n) + dx
      const y = Math.floor(selected / n) + dy
      if (x < 0 || y < 0 || x >= n || y >= n) return null
      return { selected: y * n + x, picked: 0 }
    },
  //clears the selected cell's digit, or its notes when it has none
  erase: () => (state, actions) => {
    const { game, selected } = state
    if (!playable(game) || !editable(game, selected)) return null
    if (game.board[selected] !== EMPTY) {
      return edit(state, actions, [[selected, EMPTY, game.notes[selected]]])
    }
    return edit(state, actions, [[selected, EMPTY, 0]])
  },
  //every empty cell's notes become the digits its row, column and box still allow
  autoNotes: () => (state, actions) => {
    const { game } = state
    if (!playable(game)) return { menu: null }
    const cands = candidatesOf(game.board, game.n)
    const changes = [...game.board.keys()]
      .filter((i) => game.board[i] === EMPTY)
      .map((i) => [i, EMPTY, cands[i]])
    return { menu: null, ...edit(state, actions, changes) }
  },
  undo: () => (state, actions) => {
    const { game } = state
    if (!game.history.length || !playable(game)) return { menu: null }
    const board = game.board.slice()
    const notes = game.notes.slice()
    const step = game.history.at(-1)
    for (const [i, digit, mask] of step) {
      board[i] = digit
      notes[i] = mask
    }
    const next = changed(state, board, notes, game.history.slice(0, -1), actions)
    next.game.future = [...game.future, step.map(([i]) => [i, game.board[i], game.notes[i]])]
    return { menu: null, ...next }
  },
  //puts back the step undo took, until something else changes
  redo: () => (state, actions) => {
    const { game } = state
    if (!game.future.length || !playable(game)) return { menu: null }
    const board = game.board.slice()
    const notes = game.notes.slice()
    const step = game.future.at(-1)
    for (const [i, digit, mask] of step) {
      board[i] = digit
      notes[i] = mask
    }
    const history = [...game.history, step.map(([i]) => [i, game.board[i], game.notes[i]])]
    const next = changed(state, board, notes, history, actions)
    next.game.future = game.future.slice(0, -1)
    return { menu: null, ...next }
  },
  hint:
    () =>
    ({ game }, actions) => {
      if (!playable(game)) return { menu: null }
      const { board, notes, solution, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ board, notes, solution, n }),
        game: { ...startClock(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleNoting:
    () =>
    ({ noting }) => ({ noting: !noting }),
  toggleErrors: toggleAction('errors', 'sudoku.errors', 'yes'),
  toggleTidy: toggleAction('tidy', 'sudoku.tidy', '', 'off'),
  toggleTimer: timerAction('sudoku.timer'),
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
        title={state.theme === 'classic' ? 'Sudoku' : 'Sudoku Plus'}
        page="sudoku"
        paused={state.game.paused}
        canPause={running(state.game)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="Sudoku Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Sudoku Solvers"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && <Prompt key="d" title="Sudoku" text={completeWithErrors} actions={actions} />}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.switching && <Switching key="k" title="Sudoku" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
