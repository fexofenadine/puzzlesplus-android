import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { random } from '../shell/random'
import { state, actions, view, createGame, saved, setRandom } from './app'
import { tilesOf, valuesOf } from './rules'

let wired
let current

const peek = () => (s) => {
  current = s
}

const start = (settings) => {
  wired = app({ ...state, ...settings }, { ...actions, peek }, () => null)
}

const now = () => {
  wired.peek()
  return current
}

//a game laid out from values
const gameOf = (values, extra = {}) => {
  const n = Math.sqrt(values.length)
  const { tiles, nextId } = tilesOf(values, 1)
  return { ...createGame(n), tiles, nextId, ...extra }
}

const values = () => valuesOf(now().game.tiles, now().game.n)

const key = (keyCode, extra = {}) =>
  wired.press({ keyCode, target: { tagName: 'BODY' }, preventDefault() {}, ...extra })

beforeEach(() => {
  localStorage.clear()
  setRandom(random(1))
  start({ game: createGame(4), winner: null, prompt: false, timer: false })
})

it('renders a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[class*=cell]').length).toBe(16)
})

it('deals two tiles and moves with the arrows and wasd, a new tile after each move', () => {
  expect(values().filter(Boolean)).toHaveLength(2)
  start({ game: gameOf([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  key(68)
  expect(values()[3]).toBe(4)
  expect(now().game.score).toBe(4)
  expect(values().filter(Boolean)).toHaveLength(2)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  key(37)
  expect(values()[0]).toBeGreaterThanOrEqual(4)
})

it('ignores a move that changes nothing', () => {
  start({ game: gameOf([2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  wired.slide('left')
  expect(now().game.history).toHaveLength(0)
  expect(now().game.start).toBe(-1)
})

//a board 240 px wide, so a cell is 60 px on screen
const board = { getBoundingClientRect: () => ({ width: 240 }) }

//a drag through points [x, y, ms] from the first
const drag = (points) => {
  const [[x0, y0, t0], ...rest] = points
  wired.swipeStart({ clientX: x0, clientY: y0, timeStamp: t0, button: 0, currentTarget: board })
  for (const [x, y, t] of rest) wired.swipeMove({ clientX: x, clientY: y, timeStamp: t })
  const [x, y, t] = points.at(-1)
  wired.swipeEnd({ clientX: x, clientY: y, timeStamp: t })
}

it('moves the tiles with a drag and finishes past halfway', () => {
  //the 2 travels three cells left, 180 px
  start({ game: gameOf([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  //a stand-in for the tile on the page, 60 px wide with no gap
  const tile = { dataset: { id: String(now().game.tiles[0].id) }, style: {}, offsetWidth: 60 }
  const page = { ...board, querySelectorAll: () => [tile] }
  wired.swipeStart({ clientX: 300, clientY: 100, timeStamp: 0, button: 0, currentTarget: page })
  wired.swipeMove({ clientX: 240, clientY: 102, timeStamp: 500 })
  //a third of the way, following the finger: one cell of the three
  expect(tile.style.translate).toBe('-60px 0px')
  //a slow release short of halfway springs back
  wired.swipeEnd({ clientX: 240, clientY: 102, timeStamp: 1000 })
  expect(tile.style.translate).toBe('')
  expect(now().game.history).toHaveLength(0)
  //slowly past halfway finishes
  drag([
    [300, 100, 2000],
    [260, 100, 2500],
    [200, 100, 3000],
    [200, 100, 3500],
  ])
  expect(values()[0]).toBe(2)
})

it('finishes a short quick flick and ignores a tap', () => {
  start({ game: gameOf([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  drag([
    [300, 100, 0],
    [303, 101, 10],
  ])
  expect(now().game.history).toHaveLength(0)
  drag([
    [300, 100, 0],
    [285, 100, 20],
    [270, 100, 40],
  ])
  expect(values()[0]).toBe(2)
})

it('keeps the direction a drag settled on', () => {
  start({ game: gameOf([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  //left first, then a long way down: the tiles only ever went left, and down never happens
  drag([
    [300, 100, 0],
    [285, 100, 500],
    [285, 300, 1000],
    [285, 300, 1500],
  ])
  expect(now().game.history).toHaveLength(0)
  expect(values()[3]).toBe(2)
})

it('undoes moves one at a time and keeps the game with the helped ones', () => {
  start({ game: gameOf([2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  const first = values()
  wired.slide('left')
  wired.slide('right')
  key(90, { ctrlKey: true })
  key(90, { ctrlKey: true })
  expect(values()).toEqual(first)
  expect(now().game.score).toBe(0)
  expect(now().game.undone).toBe(true)
})

it('ends the game with no move left and offers a best score, then lets undo bring it back', () => {
  //one move left: the 64s merge, the new 2 lands in the last cell and nothing matches
  const almost = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 8, 2, 64, 64]
  start({ game: gameOf(almost, { score: 500 }) })
  setRandom(() => 0.5)
  wired.slide('left')
  expect(now().game.over).toBe(true)
  expect(now().winner).toMatchObject({ score: now().game.score, assisted: false })
  wired.changeWinner({ name: 'Ada' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('2048.4')).toBe('628')
  expect(now().bestTime.clean[4]).toMatchObject({ name: 'Ada', tile: 128 })
  wired.undo()
  expect(now().game.over).toBe(false)
})

it('asks to keep going once the target is made, and starts over on a no', () => {
  start({ game: gameOf([1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  wired.slide('left')
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().prompt).toBe(false)
  expect(now().game.reached).toBe(true)
  //no second question for the next 2048
  start({ game: gameOf([1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  wired.slide('left')
  wired.answerPrompt(false)
  expect(now().game.history).toHaveLength(0)
  //leaving a game with the best score asks for a name
  expect(now().winner).toMatchObject({ score: 2048, tile: 2048 })
})

it('suggests a move as a hint and counts it as help', () => {
  start({ game: gameOf([2, 2, 4, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  key(72)
  expect(now().hint.text).toMatch(/^(←|→|↑|↓) (Left|Right|Up|Down): it /)
  expect(now().game.hinted).toBe(true)
  wired.slide('left')
  expect(now().hint).toBe(null)
})

it('keeps the timer off unless switched on, and a game with it on again stays untimed', () => {
  expect(now().timer).toBe(false)
  wired.toggleTimer()
  expect(now().timer).toBe(true)
  expect(localStorage.getItem('2048.timer')).toBe('on')
  wired.toggleTimer()
  expect(now().game.untimed).toBe(true)
})

it('comes back to a game in progress paused, with its undo steps', () => {
  start({ game: gameOf([2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) })
  wired.slide('left')
  wired.hint()
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(valuesOf(back.tiles, 4)).toEqual(values())
  expect(back.score).toBe(4)
  expect(back.hinted).toBe(true)
  start({ game: back })
  wired.pause(false)
  wired.undo()
  expect(values().slice(0, 3)).toEqual([2, 2, 4])
})

it('drops a save that does not fit, or a board with no move left', () => {
  localStorage.setItem('2048.saved', '{"version":1,"elapsed":5,"game":{"n":4,"values":[3]}}')
  expect(saved.restore()).toBe(null)
  const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
  localStorage.setItem(
    '2048.saved',
    JSON.stringify({
      version: 1,
      elapsed: 5,
      game: { n: 4, values: stuck, score: 9, history: [] },
    }),
  )
  expect(saved.restore()).toBe(null)
})
