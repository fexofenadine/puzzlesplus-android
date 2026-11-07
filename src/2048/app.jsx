import { h } from 'hyperapp'
import '../app.css'
import Winner from '../Winner'
import BackgroundSettings from '../shell/BackgroundSettings'
import Boss from '../shell/Boss'
import Taskbar from '../shell/Taskbar'
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

//a swipe needs this many pixels along its main direction
const SWIPE = 24

let swipe = null

export const state = {
  ...shellState('2048'),
  hint: null,
  prompt: false,
  //off unless switched on: a score game needs no clock
  timer: load('2048.timer') === 'on',
  about: false,
  game: saved.restore() || createGame(loadSize()),
  winner: null,
  bestTime: null,
}

export const actions = {
  ...shellActions,
  init: () => (state, actions) => {
    window.addEventListener('keydown', actions.press)
    window.addEventListener('pointerup', actions.swipeEnd)
    window.addEventListener('pointercancel', () => (swipe = null))
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
      actions.reset()
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
    ({ game }) => {
      cancelAnimationFrame(game.raf)
      const n = (payload && payload.n) || game.n
      save('2048.size', n)
      const winner = !game.offered && game.history.length ? offer(game) : null
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
    if (game.paused || game.over || state.prompt) return null
    const done = move(game.tiles, game.n, dir, game.nextId)
    if (!done.moved) return null
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
    return { hint: null, prompt: reached && !next.over, ...(winner && { winner }), game: next }
  },
  //swipes on the board, by touch or with the mouse held down
  swipeStart: (event) => () => {
    swipe = { x: event.clientX, y: event.clientY }
  },
  swipeEnd: (event) => (state, actions) => {
    if (!swipe) return
    const dx = event.clientX - swipe.x
    const dy = event.clientY - swipe.y
    swipe = null
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return
    if (Math.abs(dx) > Math.abs(dy)) actions.slide(dx > 0 ? 'right' : 'left')
    else actions.slide(dy > 0 ? 'down' : 'up')
  },
  //back one move, even out of a lost game; the game then keeps its scores with the helped ones
  undo:
    () =>
    ({ game }, actions) => {
      if (!game.history.length || game.paused) return { menu: null }
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
    <Taskbar key="h" name="2048 Plus" state={state} actions={actions} />
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
    {state.about && <About key="f" actions={actions} />}
    {state.howTo && <HowToPlay key="i" actions={actions} />}
    {state.openGames && <OpenGames key="j" state={state} actions={actions} />}
    {state.boss && <Boss key="g" state={state.boss} actions={actions} />}
  </main>
)
