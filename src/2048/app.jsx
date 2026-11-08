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
import Prompt from '../shell/Prompt'
import { load, save } from '../shell/storage'
import { listen, shellActions, shellState, shortcut, typing } from '../shell/actions'
import { clock, pauseAction, seconds } from '../shell/clock'
import { check, resumable } from '../shell/resume'
import Game, { running } from './Game'
import BestScores from './BestScores'
import { offer, recordActions } from './records'
import { canMove, highest, move, sizes, spawn, targets, tilesOf, valuesOf } from './rules'
import { suggest } from './search'
import { along, finishes, lockOf, offsetsOf, planOf } from './drag'
import { hold, letGo } from './motion'
import Switching from '../shell/Switching'
import About from './About'
import HowToPlay from './HowToPlay'

//the saved size, 4x4 when missing or out of range
const loadSize = () => {
  const saved = parseInt(load('2048.size'), 10)
  return sizes.includes(saved) ? saved : 4
}

//the undo steps a saved game keeps, so the save stays small
const KEEP = 100

let rng = Math.random

//tests deal the same tiles every time
export const setRandom = (next) => {
  rng = next
}

//a fresh board with two tiles
//history holds the values and score before each move, tile the highest tile so far
export const createGame = (n) => {
  let { tiles, nextId } = spawn([], n, rng, 1)
  ;({ tiles, nextId } = spawn(tiles, n, rng, nextId))
  return {
    n,
    tiles,
    nextId,
    score: 0,
    tile: highest(valuesOf(tiles, n)),
    history: [],
    start: -1,
    time: 0,
    raf: null,
    paused: false,
    pausedAt: 0,
    over: false,
    //the target was made, and the player chose to keep going
    reached: false,
    hinted: false,
    undone: false,
    untimed: false,
    //the best score question was asked already
    offered: false,
  }
}

const valuesCheck = (values, n) => {
  check(Array.isArray(values) && values.length === n * n)
  check(values.every((v) => v === 0 || (Number.isInteger(Math.log2(v)) && v >= 2)))
  return values
}

//the game in progress, kept so a reload comes back to it paused
export const saved = resumable({
  key: '2048.saved',
  running,
  label: ({ n, score }) => `${n} × ${n}, ${score} points`,
  pack: ({ n, tiles, score, tile, history, reached, hinted, undone, untimed }) => ({
    n,
    values: valuesOf(tiles, n),
    score,
    tile,
    history: history.slice(-KEEP),
    reached,
    hinted,
    undone,
    untimed,
  }),
  unpack: ({ n, values, score, tile, history, reached, hinted, undone, untimed }) => {
    check(sizes.includes(n) && Number.isInteger(score) && Array.isArray(history))
    for (const step of history) valuesCheck(step.values, n)
    //only games still running are kept, so a board with no move left doesn't fit
    check(canMove(valuesCheck(values, n), n))
    const { tiles, nextId } = tilesOf(values, 1)
    return {
      ...createGame(n),
      tiles,
      nextId,
      score,
      tile: tile || highest(values),
      history,
      reached: Boolean(reached),
      hinted: Boolean(hinted),
      undone: Boolean(undone),
      untimed: Boolean(untimed),
    }
  },
})

const prevent = (event) => {
  event.preventDefault()
  return false
}

//the clock starts on the first move or hint
const begin = (game, actions) => {
  if (game.start >= 0) return game
  game.raf = requestAnimationFrame(actions.tick)
  return { ...game, start: clock(), time: 1 }
}

//arrows and WASD
const keyDirs = {
  37: 'left',
  65: 'left',
  38: 'up',
  87: 'up',
  39: 'right',
  68: 'right',
  40: 'down',
  83: 'down',
}

//the pointer since it went down on the board: start, a cell's size on screen, the plan once locked
//and recent { t, x, y } samples, for the release speed
let swipe = null

//the samples the release speed is measured over, in milliseconds
const RECENT = 100

export const state = {
  ...shellState('2048'),
  hint: null,
  prompt: false,
  //off unless switched on: a score game needs no clock
  timer: load('2048.timer') === 'on',
  about: false,
  shelf: saved.list(),
  game: saved.restore() || createGame(loadSize()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    window.addEventListener('pointermove', actions.swipeMove)
    window.addEventListener('pointerup', actions.swipeEnd)
    window.addEventListener('pointercancel', actions.swipeCancel)
    listen(actions)
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
    if (key === 113 || key === 78) {
      actions.newGame()
    } else if (key === 72) {
      actions.hint()
    } else if (key === 80) {
      actions.pause()
    } else if (keyDirs[key]) {
      event.preventDefault()
      actions.slide(keyDirs[key])
    }
  },
  //a new board, keeping the size unless given; a game left with a best score asks for a name
  reset:
    (payload) =>
    ({ game, switching }) => {
      cancelAnimationFrame(game.raf)
      const n = (payload && payload.n) || game.n
      save('2048.size', n)
      swipe = null
      //a game put aside for later is not over, so it offers no best score
      const parked = switching && switching.parked
      const winner = !parked && !game.offered && game.history.length ? offer(game) : null
      return {
        menu: null,
        hint: null,
        prompt: false,
        ...(winner && { winner }),
        game: createGame(n),
      }
    },
  slide: (dir) => (state, actions) => {
    const { game } = state
    //a key during a drag ends the drag; tiles it held slide on from there, or spring back
    const held = swipe && swipe.board
    swipe = null
    const done =
      !game.paused && !game.over && !state.prompt && move(game.tiles, game.n, dir, game.nextId)
    if (!done || !done.moved) {
      letGo(held)
      return null
    }
    const { tiles, nextId } = spawn(done.tiles, game.n, rng, done.nextId)
    const values = valuesOf(tiles, game.n)
    const next = {
      ...begin(game, actions),
      tiles,
      nextId,
      score: game.score + done.score,
      tile: Math.max(game.tile, highest(values)),
      history: [...game.history, { values: valuesOf(game.tiles, game.n), score: game.score }],
      over: !canMove(values, game.n),
    }
    //making the target asks whether to keep going, once a game
    const reached = !game.reached && highest(values) >= targets[game.n]
    if (reached) next.reached = true
    let winner = null
    if (next.over) {
      cancelAnimationFrame(next.raf)
      winner = offer(next)
      next.offered = true
    }
    return {
      hint: null,
      prompt: reached && !next.over,
      ...(winner && { winner }),
      game: next,
    }
  },
  //drags on the board, by touch or with the mouse held down: the tiles follow along the direction
  //the drag settles on, and the release finishes the move or lets them spring back
  //the tiles are moved on the page directly, so a drag never renders the window
  swipeStart: (event) => (state) => {
    const { game } = state
    if (game.paused || game.over || state.prompt || event.button > 0) return
    const board = event.currentTarget
    const rect = board.getBoundingClientRect()
    const { clientX: x, clientY: y, timeStamp: t } = event
    swipe = { x, y, board, size: rect.width / game.n || 1, plan: null, samples: [{ t, x, y }] }
  },
  swipeMove: (event) => (state) => {
    if (!swipe) return
    const { clientX: x, clientY: y, timeStamp: t } = event
    swipe.samples = [...swipe.samples.filter((s) => t - s.t <= RECENT), { t, x, y }]
    const dx = x - swipe.x
    const dy = y - swipe.y
    if (!swipe.plan) {
      const dir = lockOf(dx, dy)
      if (!dir) return
      const { game } = state
      swipe.plan = planOf(game.tiles, game.n, dir, game.nextId)
    }
    hold(swipe.board, offsetsOf(swipe.plan, along(swipe.plan.dir, dx, dy) / swipe.size))
  },
  swipeEnd: (event) => (state, actions) => {
    if (!swipe) return null
    const { plan, size, samples, board } = swipe
    const { clientX: x, clientY: y, timeStamp: t } = event
    const start = swipe
    swipe = null
    if (!plan) return null
    const a = along(plan.dir, x - start.x, y - start.y)
    //from the oldest sample still recent, so a finger that stopped before lifting isn't a flick
    const first = samples.find((s) => t - s.t <= RECENT)
    const speed =
      first && t > first.t ? along(plan.dir, x - first.x, y - first.y) / (t - first.t) : 0
    if (finishes(plan, a / size, speed)) {
      actions.slide(plan.dir)
      return null
    }
    letGo(board)
    return null
  },
  swipeCancel: () => () => {
    if (swipe) letGo(swipe.board)
    swipe = null
  },
  //back one move, even out of a lost game; the game then keeps its scores with the helped ones
  undo:
    () =>
    ({ game }, actions) => {
      if (!game.history.length || game.paused) return { menu: null }
      swipe = null
      const { values, score } = game.history.at(-1)
      const { tiles, nextId } = tilesOf(values, game.nextId)
      const next = {
        ...game,
        tiles,
        nextId,
        score,
        history: game.history.slice(0, -1),
        over: false,
        undone: true,
        offered: false,
      }
      //a lost game's clock had stopped
      if (game.over && game.start >= 0) next.raf = requestAnimationFrame(actions.tick)
      return { menu: null, hint: null, game: next }
    },
  hint:
    () =>
    ({ game }, actions) => {
      if (game.paused || game.over) return { menu: null }
      const found = suggest(valuesOf(game.tiles, game.n), game.n)
      return {
        menu: null,
        hint: found ? { kind: 'move', ...found } : { kind: 'stuck', text: 'No move is left.' },
        game: { ...begin(game, actions), hinted: true },
      }
    },
  //yes keeps going past the target, no starts a new game
  answerPrompt: (yes) => (state, actions) => {
    if (!yes) actions.reset()
    return { prompt: false }
  },
  toggleTimer: () => (state) => {
    save('2048.timer', state.timer ? '' : 'on')
    return {
      menu: null,
      timer: !state.timer,
      game: state.timer ? { ...state.game, untimed: true } : state.game,
    }
  },
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
  pause: pauseAction(running, () => {
    swipe = null
    return {}
  }),
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
    {phone ? (
      <PhoneBar
        key="h"
        title={state.theme === 'classic' ? '2048' : '2048 Plus'}
        page="2048"
        paused={state.game.paused}
        canPause={running(state.game)}
        state={state}
        actions={actions}
      >
        <PhoneMenu state={state} actions={actions} />
      </PhoneBar>
    ) : (
      <Taskbar key="h" name="2048 Plus" state={state} actions={actions} />
    )}
    {state.winner && <Winner key="b" state={state.winner} actions={actions} />}
    {state.bestTime && <BestScores key="c" state={state.bestTime} actions={actions} />}
    {state.prompt && (
      <Prompt
        key="d"
        title="2048"
        text={`You made the ${targets[state.game.n]} tile! Do you want to keep going?`}
        actions={actions}
      />
    )}
    {state.backgroundSettings && (
      <BackgroundSettings key="e" state={state.backgroundSettings} actions={actions} />
    )}
    {state.switching && <Switching key="k" title="2048" actions={actions} />}
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
