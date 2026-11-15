import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, gameOf, saved } from './app'
import { BULB, CROSS, EMPTY, WHITE } from './rules'
import { makeGame, random } from './generate'

//a dealt easy 7x7 board, ready to play
const dealtGame = (seed = 5) => {
  const { layout, solution } = makeGame(7, 0, random(seed))
  return { ...createGame({ n: 7, level: 0 }), layout, solution, dealing: false }
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

//a white cell the solution leaves without a bulb, and one it gives a bulb
const plain = () => now().game.layout.findIndex((v, i) => v === WHITE && !now().game.solution[i])
const bulbs = () => [...now().game.solution.keys()].filter((i) => now().game.solution[i])

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('button[class*=dark]').length).toBe(49)
})

it('cycles a cell through bulb, cross and empty, backwards on right click, and starts the clock', () => {
  const i = plain()
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(BULB)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(CROSS)
  wired.play({ event: left, i })
  expect(now().game.board[i]).toBe(EMPTY)
  wired.play({ event: right, i })
  expect(now().game.board[i]).toBe(CROSS)
  //a wall takes no marks
  const wall = now().game.layout.findIndex((v) => v !== WHITE)
  wired.play({ event: left, i: wall })
  expect(now().game.board[wall]).toBe(EMPTY)
  clearTimeout(now().game.raf)
})

it('undoes and redoes one change at a time', () => {
  const i = plain()
  wired.play({ event: left, i })
  wired.play({ event: left, i })
  key(90, { ctrlKey: true })
  expect(now().game.board[i]).toBe(BULB)
  wired.undo()
  expect(now().game.board[i]).toBe(EMPTY)
  key(89, { ctrlKey: true })
  expect(now().game.board[i]).toBe(BULB)
  expect(now().game.history).toHaveLength(1)
  clearTimeout(now().game.raf)
})

it('wins once the bulbs light every cell, without crosses, and offers a best time', () => {
  for (const i of bulbs()) wired.play({ event: left, i })
  const { game, winner, prompt } = now()
  expect(game.win).toBe(true)
  expect(prompt).toBe(false)
  expect(winner).toMatchObject({ level: 'easy 7 × 7', hinted: false })
  wired.changeWinner({ name: 'Ada' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('lightup.7.0')).toBe(String(game.time))
  expect(now().bestTime.clean['7.0']).toMatchObject({ set: true, name: 'Ada' })
  //a won board takes no more marks
  wired.play({ event: left, i: plain() })
  expect(now().game.board[plain()]).toBe(EMPTY)
})

it('asks about a hint a little after a wrong bulb lights the last cell, at once when typed', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  //every bulb but one, then a bulb that lights the rest from the wrong place if there is one
  const { layout, solution, n } = now().game
  const all = bulbs()
  const last = all.at(-1)
  for (const i of all.slice(0, -1)) wired.play({ event: left, i })
  const sees = (a, b) => {
    const [ax, ay, bx, by] = [a % n, Math.floor(a / n), b % n, Math.floor(b / n)]
    if (ax !== bx && ay !== by) return false
    const step = ax === bx ? n : 1
    for (let c = Math.min(a, b) + step; c < Math.max(a, b); c += step) {
      if (layout[c] !== WHITE) return false
    }
    return true
  }
  //the cells the last bulb alone lights
  const board = now().game.board
  const lit = (i) => [...board.keys()].some((b) => board[b] === BULB && (b === i || sees(b, i)))
  const dark = [...layout.keys()].filter((i) => layout[i] === WHITE && !lit(i))
  const other = [...layout.keys()].find(
    (i) =>
      i !== last && layout[i] === WHITE && !solution[i] && dark.every((d) => d === i || sees(i, d)),
  )
  //not every board has such a cell, the test only means something on one that does
  if (other === undefined) return
  wired.play({ event: left, i: other })
  expect(now().game.win).toBe(false)
  expect(now().prompt).toBe(false)
  vi.advanceTimersByTime(3000)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(false)
  wired.undo()
  start({ game: now().game, cursor: other })
  key(66)
  expect(now().prompt).toBe(true)
})

it('plays from the keyboard: arrows move a cursor, space steps its cell, b and x mark it', () => {
  key(66)
  expect(now().game.history).toHaveLength(0)
  key(39)
  expect(now().cursor).toBe(24)
  const target = plain()
  while (now().cursor % 7 > target % 7) key(37)
  while (now().cursor % 7 < target % 7) key(39)
  while (now().cursor > target) key(38)
  while (now().cursor < target) key(40)
  key(66)
  expect(now().game.board[target]).toBe(BULB)
  key(66)
  expect(now().game.board[target]).toBe(EMPTY)
  key(88)
  expect(now().game.board[target]).toBe(CROSS)
  key(32)
  expect(now().game.board[target]).toBe(EMPTY)
  key(32)
  expect(now().game.board[target]).toBe(BULB)
  key(8)
  expect(now().game.board[target]).toBe(EMPTY)
  wired.play({ event: left, i: target })
  expect(now().cursor).toBe(-1)
  clearTimeout(now().game.raf)
})

it('gives a hint, counts it, and keeps hinted times apart', () => {
  wired.hint()
  expect(now().game.hinted).toBe(true)
  expect(now().hint.place.length).toBeGreaterThan(0)
  for (const i of bulbs()) wired.play({ event: left, i })
  expect(now().winner).toMatchObject({ hinted: true })
})

it('comes back to a game in progress paused, and drops a save that does not fit', () => {
  const i = plain()
  wired.play({ event: left, i })
  clearTimeout(now().game.raf)
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(back.board[i]).toBe(BULB)
  expect([...back.layout]).toEqual([...now().game.layout])
  expect(back.history).toEqual([[i, EMPTY]])
  localStorage.setItem(
    'lightup.saved',
    JSON.stringify({ version: 1, elapsed: 5, game: { n: 7, level: 0, layout: [9], history: [] } }),
  )
  expect(saved.restore()).toBe(null)
})

it('shares the walls as a link that opens the same board, and refuses one with more answers', () => {
  const { game } = now()
  wired.share()
  const code = /#play=([\w.]+)$/.exec(now().share.link)[1]
  const linked = gameOf(code)
  expect([...linked.layout]).toEqual([...game.layout])
  expect([...linked.solution]).toEqual([...game.solution])
  expect(linked.shared).toBe(true)
  //an open board with no numbers has many answers
  expect(gameOf('7.0.0')).toBe(null)
  expect(gameOf('8.0.0')).toBe(null)
})

it('deals the daily puzzle at 10 x 10 medium and leaves the saved choice alone', async () => {
  wired.reset({ daily: true })
  expect(now().game).toMatchObject({ n: 10, level: 1, dealing: true })
  expect(localStorage.getItem('lightup.size')).toBe(null)
  expect(typeof now().game.daily).toBe('string')
})

it('counts a numbered wall down as bulbs go beside it, unless switched off', async () => {
  const draw = async (shown) => {
    const container = document.createElement('div')
    await new Promise((resolve) => {
      const testView = () => <div oncreate={resolve}>{view(shown, actions)}</div>
      app(shown, actions, testView, container)
    })
    return [...container.querySelectorAll('[class*=wall]')].map((wall) => wall.textContent)
  }
  //a 2 in the corner of a small board, with a bulb beside it
  const layout = Int8Array.from([2, -1, -1, -1, -1, -1, -1, -1, -1])
  const game = { ...createGame({ n: 3, level: 0 }), layout, dealing: false }
  expect(state.countdown).toBe(true)
  expect(await draw({ ...state, game })).toEqual(['2'])
  const board = game.board.slice()
  board[1] = BULB
  expect(await draw({ ...state, game: { ...game, board } })).toEqual(['1'])
  expect(await draw({ ...state, countdown: false, game: { ...game, board } })).toEqual(['2'])
  wired.toggleCountdown()
  expect(now().countdown).toBe(false)
  expect(localStorage.getItem('lightup.countdown')).toBe('off')
})
