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
import { load, save } from '../shell/storage'
import { records } from '../shell/records'
import { tally } from '../shell/stats'
import BestTimes from '../shell/BestTimes'
import Prompt from '../shell/Prompt'
import { showRain } from '../shell/rain'
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
import { CROSS, EMPTY, FILL, cluesOf, emptyBoard, fillsLeft, sizes, solved } from './rules'
import { countSolutions } from './solver'
import { filled } from './generate'
import { deal } from './deal'
import { completeWithErrors, findHint } from './hint'
import { allowed, fallback, levelNames } from './Menu'
import Pictures from './Pictures'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'
import { celebrate } from '../shell/fireworks'
import { DAILY_BUDGET, dayOf, finish, seedOf, special } from '../shell/daily'
import { codeOf, partsOf, sharedCode } from '../shell/share'
import FireworksCanvas from '../shell/FireworksCanvas'

//the saved size and level, easy 10x10 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('nonograms.size'), 10)
  const n = sizes.includes(saved) ? saved : 10
  const level = parseInt(load('nonograms.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 0 }
  return { n, level: fallback(n, level) }
}

//an empty board with no clues until the dealer answers
export const createGame = ({ n, level }) => ({
  n,
  level,
  clues: Array.from({ length: 2 * n }, () => []),
  solution: null,
  board: emptyBoard(n),
  history: [],
  //the steps undo took back, until the next change
  future: [],
  change: 0,
  stroke: null,
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
  art: null,
  picked: false,
})

//the game in progress, kept so a reload comes back to it paused
//a half done stroke is left out, the board it started from is kept
export const saved = resumable({
  key: 'nonograms.saved',
  running,
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  pack: ({
    n,
    level,
    clues,
    solution,
    board,
    stroke,
    history,
    future,
    hinted,
    untimed,
    art,
    picked,
    daily,
    shared,
  }) => ({
    n,
    level,
    clues,
    solution: Array.from(solution),
    board: Array.from(stroke ? stroke.before : board),
    history,
    future,
    hinted,
    untimed,
    art,
    picked,
    daily,
    shared,
  }),
  unpack: ({
    n,
    level,
    clues,
    solution,
    board,
    history,
    future,
    hinted,
    untimed,
    art,
    picked,
    daily,
    shared,
  }) => {
    check(sizes.includes(n) && level >= 0 && level < levelNames.length && Array.isArray(history))
    check(Array.isArray(clues) && clues.length === 2 * n && clues.every(Array.isArray))
    check(!art || (typeof art.id === 'string' && typeof art.name === 'string' && art.level >= 0))
    return {
      ...createGame({ n, level }),
      clues,
      solution: boardOf(solution, n, EMPTY, FILL),
      board: boardOf(board, n, EMPTY, FILL),
      history,
      future: Array.isArray(future) ? future : [],
      hinted: Boolean(hinted),
      untimed: Boolean(untimed),
      daily: typeof daily === 'string' ? daily : null,
      shared: Boolean(shared),
      art: art || null,
      picked: Boolean(picked),
      dealing: false,
    }
  },
})

const { actions: recordActions } = records('nonograms', sizes, levelNames, true)

//a click steps forward through these, a right click back
const cycle = [EMPTY, FILL, CROSS]

//a finished looking board waits this long before asking, when its last fill may be on its way
//to a cross
const ASK_AFTER = 2500

let deals = 0
let changes = 0

//after a stroke or undo: a win stops the clock and any hint is out of date
//a full but unsolved board asks about a hint, at once when settled, else after a pause
const changed = (state, game, board, history, actions, settled = false) => {
  //a click that changed nothing leaves redo alone
  const future = history === game.history ? game.future : []
  const next = { ...game, board, history, future, change: ++changes }
  next.win = solved(board, next.n, next.clues)
  if (next.win) {
    stopTick(next.raf)
    celebrate()
    if (!state.game.win) tally('nonograms', { won: true, clean: !next.hinted })
    finish('nonograms', state, next, actions, record)
  }
  const stuck = !next.win && fillsLeft(board, next.n, next.clues) === 0
  if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER)
  const done = next.win && next.art ? { solved: markSolved(state.solved, next.art.id) } : null
  return { hint: null, prompt: stuck && settled, game: next, ...done }
}

//the daily puzzle's size and level
const DAILY = { n: 10, level: 1 }

//the picture as a link's code, and a game from one: null unless its clues have one solution
const shareCode = ({ n, level, solution }) =>
  codeOf(
    n,
    level,
    Array.from(solution, (v) => (v === FILL ? 1 : 0)),
    2,
  )

export const gameOf = (code) => {
  const parts = partsOf(code, 2, (n, level) => sizes.includes(n) && allowed(n, level))
  if (!parts) return null
  const { n, level, values } = parts
  const solution = Int8Array.from(values, (v) => (v ? FILL : CROSS))
  const clues = cluesOf(solution, n)
  //a picture reaches every edge, like the ones dealt here
  if (!filled(values, n) || countSolutions(clues, n, 2) !== 1) return null
  return { ...createGame({ n, level }), clues, solution, dealing: false, shared: true }
}

const linkedGame = () => {
  const code = sharedCode()
  return code && gameOf(code)
}

//drawn boards and the pool's random pictures have best times, a picture chosen by hand or
//played with hints has none
const record = (game, actions) => {
  if (!game.art) actions.win({ ...game, art: false })
  else if (!game.picked && !game.hinted) actions.win({ ...game, level: game.art.level, art: true })
}

//the pictures solved so far, kept so the picker can show them
const markSolved = (solved, id) => {
  if (solved.includes(id)) return solved
  const next = [...solved, id]
  save('nonograms.solved', JSON.stringify(next))
  return next
}

const loadSolved = () => {
  try {
    const list = JSON.parse(load('nonograms.solved'))
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

//the cells a stroke covers: the start cell, then a straight run along the row or column it
//first moved along, out to the cell the pointer is nearest
const span = ({ start, axis }, i, n) => {
  const [sx, sy] = [start % n, Math.floor(start / n)]
  const [x, y] = [i % n, Math.floor(i / n)]
  const cells = []
  if (axis === 'row') {
    for (let k = Math.min(sx, x); k <= Math.max(sx, x); k++) cells.push(sy * n + k)
  } else if (axis === 'column') {
    for (let k = Math.min(sy, y); k <= Math.max(sy, y); k++) cells.push(k * n + sx)
  } else {
    cells.push(start)
  }
  return cells
}

//the first cell's new value goes on every covered cell that had the start cell's old value,
//so a stroke of fills leaves crosses alone and shrinking it back unpaints
const paint = (stroke, i, n) => {
  const board = stroke.before.slice()
  for (const c of span(stroke, i, n)) if (board[c] === stroke.from) board[c] = stroke.to
  return board
}

//which way a stroke runs, settled by the first cell it moves to
const axisOf = (stroke, i, n) => {
  if (stroke.axis || i === stroke.start) return stroke.axis
  const dx = Math.abs((i % n) - (stroke.start % n))
  const dy = Math.abs(Math.floor(i / n) - Math.floor(stroke.start / n))
  return dx >= dy ? 'row' : 'column'
}

//the cell under a pointer, for strokes that leave the cell they started on
const cellAt = (event) => {
  const target = document.elementFromPoint?.(event.clientX, event.clientY)
  const cell = target && target.closest('[data-cell]')
  return cell ? Number(cell.dataset.cell) : -1
}

//a board from a link comes first, then the game left in progress
const opened = saved.open(linkedGame())

export const state = {
  ...shellState('nonograms'),
  hint: null,
  prompt: false,
  errors: Boolean(load('nonograms.errors')),
  timer: loadTimer('nonograms.timer'),
  rain: Boolean(load('nonograms.rain')),
  procedural: load('nonograms.procedural') !== 'off',
  symmetric: load('nonograms.symmetric') !== 'off',
  pictures: false,
  solved: loadSolved(),
  //touch screens have no right click, so a tap fills or crosses as this says
  touch: Boolean(window.matchMedia && matchMedia('(pointer: coarse)').matches),
  mode: FILL,
  shelf: saved.list(),
  game: opened || createGame(loadChoice()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    window.addEventListener('pointermove', actions.trace)
    window.addEventListener('pointerup', () => actions.up())
    window.addEventListener('pointercancel', () => actions.up())
    listen(actions)
    showRain(state.rain)
    //a resumed game is already dealt
    if (state.game.dealing) actions.reset()
  },
  press: (event) => (state, actions) => {
    if (historyKey(event, state, actions)) return
    gameKey(shortcut(event, state, actions), actions)
  },
  //deals a new board, keeping the size, level and picture settings unless given
  reset:
    (payload) =>
    ({ game, ...state }, actions) => {
      stopTick(game.raf)
      const setting = (name) =>
        payload && payload[name] !== undefined ? payload[name] : state[name]
      const procedural = setting('procedural')
      const symmetric = setting('symmetric')
      save('nonograms.procedural', procedural ? '' : 'off')
      save('nonograms.symmetric', symmetric ? '' : 'off')
      //the day's board is one size and level for everyone and leaves the saved choice alone,
      //and after it or a board from a link the next game goes back to that choice
      const day = payload && payload.daily ? dayOf() : null
      const base = day ? DAILY : special(game) ? loadChoice() : game
      const n = (payload && payload.n) || base.n
      const asked = payload && payload.level !== undefined ? payload.level : base.level
      const level = fallback(n, asked)
      const seed = day ? seedOf(day, 'nonograms') : Math.floor(Math.random() * 2 ** 32)
      //a picture picked by hand comes from the pool whatever the setting
      const pick = (payload && payload.pick) || null
      if (!day) {
        save('nonograms.size', n)
        save('nonograms.level', level)
      }
      const id = ++deals
      //the day's board is always a drawn, symmetric one
      const options = day
        ? { budget: DAILY_BUDGET }
        : {
            art: Boolean(pick) || !procedural,
            pick,
            avoid: game.art && game.art.id,
            symmetric,
          }
      deal(n, level, seed, options).then((dealt) => actions.dealt({ id, ...dealt }))
      return {
        menu: null,
        hint: null,
        prompt: false,
        procedural,
        symmetric,
        game: { ...createGame({ n, level }), deal: id, picked: Boolean(pick), daily: day },
      }
    },
  //an answer for an older deal is dropped
  dealt:
    ({ id, clues, solution, level, art }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      const picture = art ? { ...art, level } : null
      return { game: { ...game, clues, solution, dealing: false, art: picture } }
    },
  //a press starts a stroke
  down:
    ({ event, i }) =>
    ({ game, mode }, actions) => {
      if (event.button !== 0 && event.button !== 2) return null
      if (game.dealing || game.paused || game.win || game.stroke) return null
      const touch = event.pointerType === 'touch'
      const from = game.board[i]
      let to = cycle[(cycle.indexOf(from) + (event.button === 2 ? 2 : 1)) % 3]
      if (touch) to = from === mode ? EMPTY : mode
      const stroke = { start: i, from, to, axis: null, before: game.board, touch }
      return {
        ...(touch && { touch }),
        game: { ...startClock(game, actions), stroke, board: paint(stroke, i, game.n) },
      }
    },
  //the pointer moved: only a stroke cares which cell is under it
  trace: (event) => (state, actions) => {
    if (!state.game.stroke) return
    const i = cellAt(event)
    if (i >= 0) actions.drag(i)
  },
  drag:
    (i) =>
    ({ game }) => {
      const { stroke, n } = game
      if (!stroke) return null
      const next = { ...stroke, axis: axisOf(stroke, i, n) }
      const board = paint(next, i, n)
      if (board.every((v, c) => v === game.board[c])) return null
      return { game: { ...game, stroke: next, board } }
    },
  //a stroke is one undo step, and the board is only judged once it ends
  //only a single mouse click that fills may still be on its way to a cross
  up: () => (state, actions) => {
    const { game } = state
    const { stroke, board } = game
    if (!stroke) return null
    const step = [...board.keys()]
      .filter((c) => board[c] !== stroke.before[c])
      .map((c) => [c, stroke.before[c]])
    const history = step.length ? [...game.history, step] : game.history
    const passing =
      step.length === 1 && stroke.from === EMPTY && stroke.to === FILL && !stroke.touch
    return changed(state, { ...game, stroke: null }, board, history, actions, !passing)
  },
  undo: () => (state, actions) => {
    const { game } = state
    if (!game.history.length || game.win || game.paused || game.dealing || game.stroke) {
      return { menu: null }
    }
    const step = game.history.at(-1)
    const board = game.board.slice()
    for (const [c, from] of step) board[c] = from
    const next = changed(state, game, board, game.history.slice(0, -1), actions)
    next.game.future = [...game.future, step.map(([c]) => [c, game.board[c]])]
    return { menu: null, ...next }
  },
  //puts back the stroke undo took, until something else changes
  redo: () => (state, actions) => {
    const { game } = state
    if (!game.future.length || game.win || game.paused || game.dealing || game.stroke) {
      return { menu: null }
    }
    const step = game.future.at(-1)
    const board = game.board.slice()
    for (const [c, to] of step) board[c] = to
    const history = [...game.history, step.map(([c]) => [c, game.board[c]])]
    const next = changed(state, game, board, history, actions)
    next.game.future = game.future.slice(0, -1)
    return { menu: null, ...next }
  },
  //the delayed question, dropped if the board changed or the game moved on meanwhile
  ask:
    (change) =>
    ({ game }) => {
      if (game.change !== change || game.win || game.paused || game.stroke) return null
      return { prompt: fillsLeft(game.board, game.n, game.clues) === 0 }
    },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.dealing || game.win || game.paused || game.stroke) return { menu: null }
      const { board, solution, clues, n } = game
      return {
        menu: null,
        prompt: false,
        hint: findHint({ board, solution, clues, n }),
        game: { ...startClock(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  setMode: (mode) => ({ mode }),
  toggleErrors: toggleAction('errors', 'nonograms.errors', 'yes'),
  toggleTimer: timerAction('nonograms.timer'),
  toggleRain: () => (state) => {
    save('nonograms.rain', state.rain ? '' : 'yes')
    showRain(!state.rain)
    return { menu: null, rain: !state.rain }
  },
  //a picture setting only means something on a new board, so it deals one (asking first mid game)
  toggleProcedural:
    () =>
    ({ procedural }, actions) => {
      actions.newGame({ procedural: !procedural })
    },
  toggleSymmetric:
    () =>
    ({ symmetric }, actions) => {
      actions.newGame({ symmetric: !symmetric })
    },
  togglePictures:
    () =>
    ({ pictures }) => ({ menu: null, pictures: !pictures }),
  choosePicture: (id) => (state, actions) => {
    actions.newGame({ pick: id })
    return { pictures: false }
  },
  //a half done stroke is kept as it is
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
        title={state.theme === 'classic' ? 'Nonograms' : 'Nonograms Plus'}
        page="nonograms"
        paused={state.game.paused}
        canPause={running(state.game)}
        look={look(state, actions)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="Nonograms Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Nonogram Solvers"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        art
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && (
      <Prompt key="d" title="Nonograms" text={completeWithErrors} actions={actions} />
    )}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.pictures && <Pictures key="l" state={state} actions={actions} />}
    {state.switching && <Switching key="k" title="Nonograms" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
