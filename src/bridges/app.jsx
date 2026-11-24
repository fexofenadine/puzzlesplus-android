import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
import OpenGames from '../shell/OpenGames'
import { load, save } from '../shell/storage'
import { records } from '../shell/records'
import { tally, timeOf } from '../shell/stats'
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
import {
  emptyBoard,
  islandCells,
  linkBetween,
  linksOf,
  sizes,
  solved,
  stepLink,
  unfinished,
} from './rules'
import { completeWithErrors, findHint } from './hint'
import { deal } from './deal'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'
import { celebrate, stopFireworks } from '../shell/fireworks'
import { arrows } from '../shell/cursor'
import { DAILY_BUDGET, dayOf, finish, seedOf, special } from '../shell/daily'
import { codeOf, partsOf, sharedCode } from '../shell/share'
import FireworksCanvas from '../shell/FireworksCanvas'
import PhoneBar from '../shell/PhoneBar'
import { phone } from '../shell/phone'
import PhoneMenu from './PhoneMenu'

//the saved size and level, easy 7x7 when missing or out of range
const loadChoice = () => {
  const saved = parseInt(load('bridges.size'), 10)
  const n = sizes.includes(saved) ? saved : 7
  const level = parseInt(load('bridges.level'), 10)
  if (!(level >= 0 && level < levelNames.length)) return { n, level: 0 }
  return { n, level: fallback(n, level) }
}

//an empty board until the dealer answers
//the board holds the bridges on each link of the islands, in the order linksOf lists them
export const createGame = ({ n, level }) => ({
  n,
  level,
  //all water until the dealer answers
  islands: new Int8Array(n * n),
  solution: null,
  board: emptyBoard(0),
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

//a saved list of bridge counts, one per link
const countsOf = (list, links) => {
  check(Array.isArray(list) && list.length === links && list.every((v) => v >= 0 && v <= 2))
  return Int8Array.from(list)
}

//the game in progress, kept so a reload comes back to it paused
export const saved = resumable({
  key: 'bridges.saved',
  running,
  fresh: { cursor: -1, selected: -1 },
  label: ({ n, level }) => `${n} × ${n} ${levelNames[level]}`,
  pack: ({
    n,
    level,
    islands,
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
    islands: Array.from(islands),
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
    islands,
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
    const found = boardOf(islands, n, 0, 8)
    const count = linksOf(found, n).links.length
    return {
      ...createGame({ n, level }),
      islands: found,
      solution: countsOf(solution, count),
      board: countsOf(board, count),
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

const { actions: recordActions } = records('bridges', sizes, levelNames)

//the daily puzzle's size and level
const DAILY = { n: 10, level: 1 }

//the islands as a link's code, and a game from one: null unless it is a board with one solution
const shareCode = ({ n, level, islands }) => codeOf(n, level, Array.from(islands), 9)

//a link that takes more branches than this to settle is not taken for a puzzle
const SHARED_STEPS = 200000

export const gameOf = (code) => {
  const parts = partsOf(code, 9, (n, level) => sizes.includes(n) && allowed(n, level))
  if (!parts) return null
  const { n, level, values } = parts
  const islands = Int8Array.from(values)
  if (!islands.some(Boolean) || countSolutions(islands, n, 2, SHARED_STEPS) !== 1) return null
  const solution = solve(islands, n)
  return {
    ...createGame({ n, level }),
    islands,
    solution,
    board: emptyBoard(solution.length),
    dealing: false,
    shared: true,
  }
}

const linkedGame = () => {
  const code = sharedCode()
  return code && gameOf(code)
}

//a full board that is not a win waits this long before asking, when a bridge may be on its way
const ASK_AFTER = 2500

let deals = 0
let changes = 0

//after a link changes: a win, or islands all met that are not one
const changed = (state, board, history, actions) => {
  const next = { ...startClock(state.game, actions), board, history, future: [], change: ++changes }
  next.win = solved(next.islands, next.n, board)
  if (next.win) {
    stopTick(next.raf)
    celebrate()
    if (!state.game.win)
      tally('bridges', {
        won: true,
        clean: !next.hinted,
        time: timeOf(state.timer, next),
        level: saved.label(next),
      })
    finish('bridges', state, next, actions)
  }
  const stuck = !next.win && unfinished(next.islands, next.n, board) === 0
  if (stuck) setTimeout(() => actions.ask(next.change), ASK_AFTER)
  return { hint: null, prompt: false, game: next }
}

//one click more on a link, back for a right click, null when nothing changes
const bump = (state, actions, l, back) => {
  const { game } = state
  if (game.dealing || game.paused || game.win) return null
  const to = stepLink(game.islands, game.n, game.board, l, back)
  if (to === null || to === game.board[l]) return null
  const board = game.board.slice()
  board[l] = to
  return changed(state, board, [...game.history, [l, game.board[l]]], actions)
}

//the island nearest to one in a direction, the one nearest the middle when there is no start
const nearestIsland = (islands, n, from, [dx, dy]) => {
  const all = islandCells(islands)
  if (!all.length) return -1
  if (from < 0) {
    const mid = (n - 1) / 2
    const far = (i) => Math.abs((i % n) - mid) + Math.abs(Math.floor(i / n) - mid)
    return all.reduce((best, i) => (far(i) < far(best) ? i : best))
  }
  const x0 = from % n
  const y0 = Math.floor(from / n)
  let best = from
  let bestScore = Infinity
  for (const i of all) {
    const along = ((i % n) - x0) * dx + (Math.floor(i / n) - y0) * dy
    if (along <= 0) continue
    const aside = Math.abs(((i % n) - x0) * dy) + Math.abs((Math.floor(i / n) - y0) * dx)
    if (along + 3 * aside < bestScore) {
      bestScore = along + 3 * aside
      best = i
    }
  }
  return best
}

//a board from a link comes first, then the game left in progress
const opened = saved.open(linkedGame())

export const state = {
  ...shellState('bridges'),
  hint: null,
  prompt: false,
  //the island clicked first, waiting for a second, and the one a press began on
  selected: -1,
  drag: -1,
  //the island the arrow keys are on, -1 until they are used and again after a click
  cursor: -1,
  errors: Boolean(load('bridges.errors')),
  //islands show the bridges they still need, on unless switched off
  countdown: load('bridges.countdown') !== 'off',
  timer: loadTimer('bridges.timer'),
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
  //arrows move a cursor from island to island, shift with an arrow builds a bridge that way
  press: (event) => (state, actions) => {
    if (historyKey(event, state, actions)) return
    const key = shortcut(event, state, actions)
    if (key === null || gameKey(key, actions)) return
    if (!arrows[key]) return
    if (event.shiftKey) actions.build(arrows[key])
    else actions.move(arrows[key])
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
      const seed = day ? seedOf(day, 'bridges') : Math.floor(Math.random() * 2 ** 32)
      if (!day) {
        save('bridges.size', n)
        save('bridges.level', level)
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
        drag: -1,
        cursor: -1,
        game: { ...createGame({ n, level }), deal: id, daily: day },
      }
    },
  //an answer for an older deal is dropped
  dealt:
    ({ id, islands, solution }) =>
    ({ game }) => {
      if (game.deal !== id) return null
      return {
        game: { ...game, islands, solution, board: emptyBoard(solution.length), dealing: false },
      }
    },
  //a press on an island starts a bridge, on a second island in line it is built (the click, click
  //way); water on a link steps that link
  play:
    ({ event, i }) =>
    (state, actions) => {
      if (event.button !== 0 && event.button !== 2) return null
      const { game, selected } = state
      if (game.dealing || game.paused || game.win) return null
      const back = event.button === 2
      const { islands, n } = game
      if (islands[i]) {
        if (selected >= 0 && selected !== i) {
          const l = linkBetween(islands, n, selected, i)
          if (l >= 0) {
            return { selected: -1, drag: -1, cursor: -1, ...bump(state, actions, l, back) }
          }
        }
        //a press that moves on to another island before the button comes up is a drag
        window.addEventListener('pointerup', actions.up)
        return { selected: selected === i ? -1 : i, drag: i, cursor: -1 }
      }
      const list = linksOf(islands, n).through.get(i) || []
      //a hint's bridge comes first when several links run over the water
      const hinted = new Set(((state.hint && state.hint.place) || []).map(([c]) => c))
      const l = list.find((c) => game.board[c] > 0) ?? list.find((c) => hinted.has(c)) ?? list[0]
      if (l === undefined) return { selected: -1, cursor: -1 }
      return { selected: -1, cursor: -1, ...bump(state, actions, l, back) }
    },
  //the button comes up: over another island in line with where it went down, that is a bridge
  up: (event) => (state, actions) => {
    window.removeEventListener('pointerup', actions.up)
    const { game, drag } = state
    if (drag < 0) return null
    const found = document.elementFromPoint(event.clientX, event.clientY)
    const cell = found && found.closest('[data-cell]')
    const to = cell ? Number(cell.dataset.cell) : -1
    if (to >= 0 && to !== drag && game.islands[to]) {
      const l = linkBetween(game.islands, game.n, drag, to)
      if (l >= 0) return { drag: -1, selected: -1, ...bump(state, actions, l, event.button === 2) }
    }
    return { drag: -1 }
  },
  move:
    (step) =>
    ({ game, cursor }) => {
      if (game.dealing || game.paused || game.win) return null
      return { selected: -1, cursor: nearestIsland(game.islands, game.n, cursor, step) }
    },
  //shift and an arrow on the cursor's island: the bridge towards the next island that way
  build: (step) => (state, actions) => {
    const { game, cursor } = state
    if (cursor < 0) return actions.move(step)
    const { links, at } = linksOf(game.islands, game.n)
    const [dx, dy] = step
    const x = cursor % game.n
    const y = Math.floor(cursor / game.n)
    const l = (at.get(cursor) || []).find((c) => {
      const other = links[c].a === cursor ? links[c].b : links[c].a
      return (
        Math.sign((other % game.n) - x) === dx && Math.sign(Math.floor(other / game.n) - y) === dy
      )
    })
    return l === undefined ? null : bump(state, actions, l, false)
  },
  //the delayed question, dropped if the board changed or the game moved on meanwhile
  ask:
    (change) =>
    ({ game }) => {
      if (game.change !== change || game.win || game.paused) return null
      if (unfinished(game.islands, game.n, game.board)) return null
      return { prompt: true }
    },
  undo: () => (state, actions) => {
    const { game } = state
    if (!game.history.length || game.win || game.paused || game.dealing) return { menu: null }
    const [l, from] = game.history.at(-1)
    const board = game.board.slice()
    board[l] = from
    const next = changed(state, board, game.history.slice(0, -1), actions)
    next.game.future = [...game.future, [l, game.board[l]]]
    return { menu: null, ...next }
  },
  //puts back what undo took, until something else changes
  redo: () => (state, actions) => {
    const { game } = state
    if (!game.future.length || game.win || game.paused || game.dealing) return { menu: null }
    const [l, to] = game.future.at(-1)
    const board = game.board.slice()
    board[l] = to
    const next = changed(state, board, [...game.history, [l, game.board[l]]], actions)
    next.game.future = game.future.slice(0, -1)
    return { menu: null, ...next }
  },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.dealing || game.win || game.paused) return { menu: null }
      const { islands, board, solution, n } = game
      return {
        menu: null,
        prompt: false,
        selected: -1,
        hint: findHint({ islands, board, solution, n }),
        game: { ...startClock(game, actions), hinted: true },
      }
    },
  //yes asks for a hint, no leaves the player to find the mistake
  answerPrompt: (yes) => (state, actions) => {
    if (yes) actions.hint()
    return { prompt: false }
  },
  toggleErrors: toggleAction('errors', 'bridges.errors', 'yes'),
  toggleCountdown: toggleAction('countdown', 'bridges.countdown', '', 'off'),
  toggleTimer: timerAction('bridges.timer'),
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
        title={state.theme === 'classic' ? 'Bridges' : 'Bridges Plus'}
        page="bridges"
        paused={state.game.paused}
        canPause={running(state.game)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="Bridges Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && (
      <BestTimes
        key="c"
        title="Fastest Bridge Builders"
        sizes={sizes}
        levelNames={levelNames}
        allowed={allowed}
        state={state.bestTime}
        actions={actions}
      />
    )}
    {state.prompt && <Prompt key="d" title="Bridges" text={completeWithErrors} actions={actions} />}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.switching && <Switching key="k" title="Bridges" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
