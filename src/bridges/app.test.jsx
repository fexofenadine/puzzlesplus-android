import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, gameOf, saved } from './app'
import { emptyBoard, linksOf, solved } from './rules'
import { makeGame, random } from './generate'

//a dealt easy 7x7 board, ready to play
const dealtGame = (seed = 5) => {
  const { islands, solution } = makeGame(7, 0, random(seed))
  return {
    ...createGame({ n: 7, level: 0 }),
    islands,
    solution,
    board: emptyBoard(solution.length),
    dealing: false,
  }
}

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

const left = { button: 0 }
const right = { button: 2 }

const key = (keyCode, extra = {}) =>
  wired.press({ keyCode, target: { tagName: 'BODY' }, preventDefault() {}, ...extra })

afterEach(() => vi.useRealTimers())

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame() })
})

//the links of the board, and the cell of the first island of a link to press
const links = () => linksOf(now().game.islands, now().game.n).links
//a link the solution gives a bridge, and one it leaves empty
const used = () => [...now().game.solution.keys()].filter((l) => now().game.solution[l])

//builds the whole solution with a click on each island and then the other, once per bridge
const build = () => {
  for (const l of used()) {
    for (let k = 0; k < now().game.solution[l]; k++) {
      wired.play({ event: left, i: links()[l].a })
      wired.play({ event: left, i: links()[l].b })
    }
  }
}

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[data-cell]').length).toBe(49)
})

it('steps a link through one bridge, two and none from its water, backwards on right click', () => {
  const l = used()[0]
  const water = links()[l].cells[0]
  wired.play({ event: left, i: water })
  expect(now().game.board[l]).toBe(1)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  wired.play({ event: left, i: water })
  expect(now().game.board[l]).toBe(links()[l].max === 2 ? 2 : 0)
  wired.play({ event: left, i: water })
  wired.play({ event: right, i: water })
  expect(now().game.board[l]).toBeGreaterThan(0)
  clearTimeout(now().game.raf)
})

it('builds a bridge with a click on one island and then another in line', () => {
  const l = used()[0]
  const { a, b } = links()[l]
  wired.play({ event: left, i: a })
  expect(now().selected).toBe(a)
  wired.play({ event: left, i: b })
  expect(now().game.board[l]).toBe(1)
  expect(now().selected).toBe(-1)
  //a click on the island twice puts the selection away
  wired.play({ event: left, i: a })
  wired.play({ event: left, i: a })
  expect(now().selected).toBe(-1)
  clearTimeout(now().game.raf)
})

it('undoes and redoes one change at a time', () => {
  const l = used()[0]
  const water = links()[l].cells[0]
  wired.play({ event: left, i: water })
  wired.play({ event: left, i: water })
  key(90, { ctrlKey: true })
  expect(now().game.board[l]).toBe(1)
  wired.undo()
  expect(now().game.board[l]).toBe(0)
  key(89, { ctrlKey: true })
  expect(now().game.board[l]).toBe(1)
  expect(now().game.history).toHaveLength(1)
  clearTimeout(now().game.raf)
})

it('wins once every island has its bridges and all are joined, and offers a best time', () => {
  build()
  const { game, winner, prompt } = now()
  expect(solved(game.islands, game.n, game.board)).toBe(true)
  expect(game.win).toBe(true)
  expect(prompt).toBe(false)
  expect(winner).toMatchObject({ level: 'easy 7 × 7', hinted: false })
  wired.changeWinner({ name: 'Ada' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('bridges.7.0')).toBe(String(game.time))
  expect(now().bestTime.clean['7.0']).toMatchObject({ set: true, name: 'Ada' })
  //a won board takes no more bridges
  wired.play({ event: left, i: links()[0].cells[0] })
  expect(now().game.board[0]).toBe(game.board[0])
})

it('plays from the keyboard: arrows hop between islands, shift and an arrow builds', () => {
  key(39, { shiftKey: true })
  expect(now().game.history).toHaveLength(0)
  expect(now().cursor).toBeGreaterThanOrEqual(0)
  const from = now().cursor
  //every island has a link somewhere, find the arrow that builds one
  const { islands, n } = now().game
  const l = linksOf(islands, n).links.findIndex((link) => link.a === from || link.b === from)
  const link = links()[l]
  const other = link.a === from ? link.b : link.a
  const dx = Math.sign((other % n) - (from % n))
  const dy = Math.sign(Math.floor(other / n) - Math.floor(from / n))
  const code = dx > 0 ? 39 : dx < 0 ? 37 : dy > 0 ? 40 : 38
  key(code, { shiftKey: true })
  expect(now().game.board[l]).toBe(1)
  key(code)
  expect(now().cursor).not.toBe(-1)
  wired.play({ event: left, i: from })
  expect(now().cursor).toBe(-1)
  clearTimeout(now().game.raf)
})

it('gives a hint, counts it, and keeps hinted times apart', () => {
  wired.hint()
  expect(now().game.hinted).toBe(true)
  expect(now().hint.place.length).toBeGreaterThan(0)
  build()
  expect(now().winner).toMatchObject({ hinted: true })
})

it('comes back to a game in progress paused, and drops a save that does not fit', () => {
  const l = used()[0]
  wired.play({ event: left, i: links()[l].cells[0] })
  clearTimeout(now().game.raf)
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(back.board[l]).toBe(1)
  expect([...back.islands]).toEqual([...now().game.islands])
  expect(back.history).toEqual([[l, 0]])
  localStorage.setItem(
    'bridges.saved',
    JSON.stringify({ version: 1, elapsed: 5, game: { n: 7, level: 0, islands: [9], history: [] } }),
  )
  expect(saved.restore()).toBe(null)
})

it('shares the islands as a link that opens the same board, and refuses one with more answers', () => {
  const { game } = now()
  wired.share()
  const code = /#play=([\w.]+)$/.exec(now().share.link)[1]
  const linked = gameOf(code)
  expect([...linked.islands]).toEqual([...game.islands])
  expect([...linked.solution]).toEqual([...game.solution])
  expect(linked.shared).toBe(true)
  //no islands, a size that isn't one
  expect(gameOf('7.0.0')).toBe(null)
  expect(gameOf('8.0.0')).toBe(null)
})

it('deals the daily puzzle at 10 x 10 medium and leaves the saved choice alone', async () => {
  wired.reset({ daily: true })
  expect(now().game).toMatchObject({ n: 10, level: 1, dealing: true })
  expect(localStorage.getItem('bridges.size')).toBe(null)
  expect(typeof now().game.daily).toBe('string')
})

it('counts an island down as bridges reach it, red below zero, unless switched off', async () => {
  const draw = async (shown) => {
    const container = document.createElement('div')
    await new Promise((resolve) => {
      const testView = () => <div oncreate={resolve}>{view(shown, actions)}</div>
      app(shown, actions, testView, container)
    })
    return [...container.querySelectorAll('[class*=island]')].map((island) => ({
      text: island.textContent,
      red: island.className.includes('islandError'),
    }))
  }
  //a 2 and a 1 along the top row of a small board, one link between them
  const islands = Int8Array.from([2, 0, 1, 0, 0, 0, 0, 0, 0])
  const game = { ...createGame({ n: 3, level: 0 }), islands, board: emptyBoard(1), dealing: false }
  expect(state.countdown).toBe(true)
  const one = { ...game, board: Int8Array.from([1]) }
  expect(await draw({ ...state, game: one })).toEqual([
    { text: '1', red: false },
    { text: '0', red: false },
  ])
  const two = { ...game, board: Int8Array.from([2]) }
  expect(await draw({ ...state, game: two })).toEqual([
    { text: '0', red: false },
    { text: '-1', red: true },
  ])
  expect(await draw({ ...state, countdown: false, game: two })).toEqual([
    { text: '2', red: false },
    { text: '1', red: false },
  ])
  wired.toggleCountdown()
  expect(now().countdown).toBe(false)
  expect(localStorage.getItem('bridges.countdown')).toBe('off')
})
