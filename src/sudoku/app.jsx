import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import OpenGames from '../shell/OpenGames'
import { load, save } from '../shell/storage'
import { records } from '../shell/records'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
import { listen, shellActions, shellState, shortcut, typing } from '../shell/actions'
import { clock, loadTimer, pauseAction, seconds, timed, timerAction } from '../shell/clock'
import { check, resumable } from '../shell/resume'
import Game, { running } from './Game'
import {
  EMPTY,
  bit,
  boxShapes,
  candidatesOf,
  emptyBoard,
  full,
  geometry,
  sizes,
  solved,
} from './rules'
import { levels } from './techniques'
import { deal } from './deal'
import { completeWithErrors, findHint } from './hint'
import { allowed, fallback, levelNames } from './Menu'
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

//a board of digits from 0 to n for size n
const boardOf = (cells, n) => {
  check(Array.isArray(cells) && cells.length === n * n && cells.every((v) => v >= 0 && v <= n))
  return Int8Array.from(cells)
}

//the game in progress, kept so a reload comes back to it paused
export const saved = resumable({
  key: 'sudoku.saved',
  running,
  pack: ({ n, level, givens, solution, board, notes, history, hinted, untimed }) => ({
    n,
    level,
    givens: Array.from(givens),
    solution: Array.from(solution),
    board: Array.from(board),
    notes: Array.from(notes),
    history,
    hinted,
    untimed,
  }),
  unpack: ({ n, level, givens, solution, board, notes, history, hinted, untimed }) => {
    check(sizes.includes(n) && boxShapes[n] && level >= 0 && level < levels.length)
    check(Array.isArray(notes) && notes.length === n * n && Array.isArray(history))
    return {
      ...createGame({ n, level }),
      givens: boardOf(givens, n),
      solution: boardOf(solution, n),
      board: boardOf(board, n),
      notes: Int32Array.from(notes),
      history,
      hinted: Boolean(hinted),
      untimed: Boolean(untimed),
      dealing: false,
    }
  },
})

const { actions: recordActions } = records('sudoku', sizes, levelNames)

let deals = 0

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

//a cell the player may change
const editable = (game, i) => i >= 0 && game.givens[i] === EMPTY

//whether the game takes moves at all
const playable = (game) => !game.dealing && !game.paused && !game.win

//after a change: a win stops the clock, a full board that isn't one asks about a hint
const changed = (state, board, notes, history, actions) => {
  const next = { ...begin(state.game, actions), board, notes, history }
  next.win = solved(board, next.n)
  if (next.win) {
    cancelAnimationFrame(next.raf)
    if (timed({ ...state, game: next })) actions.win(next)
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
  about: false,
  game: saved.restore() || createGame(loadChoice()),
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
    //undo is the one shortcut with a modifier
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.keyCode === 90) {
      if (typing(event) || state.boss || state.windowState !== 'open') return
      event.preventDefault()
      actions.undo()
      return
    }
    const key = shortcut(event, state, actions)
    if (key === null) return
    const digit = digitOf(event)
    if (key === 113 || key === 78) {
      actions.reset()
    } else if (key === 72) {
      actions.hint()
    } else if (key === 80) {
      actions.pause()
    } else if (arrows[key]) {
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
      cancelAnimationFrame(game.raf)
      const n = (payload && payload.n) || game.n
      const asked = payload && payload.level !== undefined ? payload.level : game.level
      const level = fallback(n, asked)
      save('sudoku.size', n)
      save('sudoku.level', level)
      const id = ++deals
      deal(n, level, Math.floor(Math.random() * 2 ** 32)).then((dealt) =>
        actions.dealt({ id, ...dealt }),
      )
      return {
        menu: null,
        hint: null,
        prompt: false,
        selected: -1,
        picked: 0,
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
    for (const [i, digit, mask] of game.history.at(-1)) {
      board[i] = digit
      notes[i] = mask
    }
    return { menu: null, ...changed(state, board, notes, game.history.slice(0, -1), actions) }
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
        game: { ...begin(game, actions), hinted: true },
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
  toggleErrors: () => (state) => {
    save('sudoku.errors', state.errors ? '' : 'yes')
    return { menu: null, errors: !state.errors }
  },
  toggleTidy: () => (state) => {
    save('sudoku.tidy', state.tidy ? 'off' : '')
    return { menu: null, tidy: !state.tidy }
  },
  toggleTimer: timerAction('sudoku.timer'),
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
    <Game key="a" state={state} actions={actions} />
    <Taskbar key="h" name="Sudoku Plus" state={state} actions={actions} />
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
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
