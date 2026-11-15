import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, gameOf, saved } from './app'
import { CROSS, EMPTY, FILL } from './rules'
import { makePuzzle, random } from './generate'
import { clockDigits } from '../shell/clock'
import Digit from '../Digit'

//a dealt 5x5 board, ready to play
const dealtGame = (seed = 5) => {
  const { clues, solution } = makePuzzle(5, random(seed))
  return { ...createGame({ n: 5, level: 0 }), clues, solution, dealing: false }
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

const left = { button: 0, pointerType: 'mouse' }
const right = { button: 2, pointerType: 'mouse' }
const tap = { button: 0, pointerType: 'touch' }

const click = (i, event = left) => {
  wired.down({ event, i })
  wired.up()
}

const board = () => [...now().game.board]

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame(), mode: FILL })
})

afterEach(() => {
  vi.useRealTimers()
})

//every fill of the solution but one, and one wrong fill in its place, all but the wrong fill done
const almost = () => {
  const { solution } = now().game
  const missing = solution.indexOf(1)
  const wrong = solution.indexOf(0)
  solution.forEach((v, i) => v && i !== missing && click(i))
  return wrong
}

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[data-cell]').length).toBe(100)
})

it('cycles a cell through filled, crossed and empty, backwards on right click, and starts the clock', () => {
  click(0)
  expect(board()[0]).toBe(FILL)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  click(0)
  expect(board()[0]).toBe(CROSS)
  click(0)
  expect(board()[0]).toBe(EMPTY)
  click(0, right)
  expect(board()[0]).toBe(CROSS)
})

it('paints a stroke along the row it first moves along, as one undo step', () => {
  wired.down({ event: left, i: 6 })
  wired.drag(7)
  //moving off the row keeps to it, out to the nearest cell along it
  wired.drag(14)
  expect(board().slice(5, 10)).toEqual([EMPTY, FILL, FILL, FILL, FILL])
  expect(board()[14]).toBe(EMPTY)
  //coming back unpaints
  wired.drag(7)
  expect(board().slice(5, 10)).toEqual([EMPTY, FILL, FILL, EMPTY, EMPTY])
  wired.up()
  expect(now().game.history).toHaveLength(1)
  wired.undo()
  expect(board().every((v) => v === EMPTY)).toBe(true)
  //redo paints the whole stroke again, and undo still takes it back
  wired.redo()
  expect(board().slice(5, 10)).toEqual([EMPTY, FILL, FILL, EMPTY, EMPTY])
  wired.undo()
  expect(board().every((v) => v === EMPTY)).toBe(true)
})

it('paints down a column and leaves cells with another value alone', () => {
  click(10, right)
  wired.down({ event: left, i: 0 })
  wired.drag(5)
  wired.drag(20)
  wired.up()
  expect([0, 5, 10, 15, 20].map((i) => board()[i])).toEqual([FILL, FILL, CROSS, FILL, FILL])
})

it('fills or crosses on a tap as the touch mode says', () => {
  click(0, tap)
  expect(board()[0]).toBe(FILL)
  expect(now().touch).toBe(true)
  click(0, tap)
  expect(board()[0]).toBe(EMPTY)
  wired.setMode(CROSS)
  click(0, tap)
  expect(board()[0]).toBe(CROSS)
})

it('wins once every clue matches, without crosses, and stops taking strokes', () => {
  const { solution } = now().game
  solution.forEach((v, i) => v && click(i))
  expect(now().game.win).toBe(true)
  const before = board()
  click(solution.indexOf(0))
  expect(board()).toEqual(before)
})

it('ignores the board while paused', () => {
  click(0)
  wired.pause(true)
  click(1)
  expect(board()[1]).toBe(EMPTY)
  wired.pause(false)
  click(1)
  expect(board()[1]).toBe(FILL)
})

it('grows the clock a fourth digit past 999 except on classic', () => {
  expect(clockDigits('nord', 999)).toBe(3)
  expect(clockDigits('nord', 1000)).toBe(4)
  expect(clockDigits('classic', 1500)).toBe(3)
  const digits = (vnode) =>
    vnode.children
      .flat()
      .map((svg) => svg.attributes['data-n'])
      .join('')
  expect(digits(Digit({ value: 1234, digits: 4 }))).toBe('1234')
  expect(digits(Digit({ value: 1234 }))).toBe('999')
  expect(digits(Digit({ value: -5 }))).toBe('-05')
})

it('gives a hint, counts it, starts the clock, and drops it once the board changes', () => {
  wired.hint()
  const { hint, game } = now()
  expect(hint.text.length).toBeGreaterThan(0)
  expect(hint.place.length).toBeGreaterThan(0)
  expect(game.hinted).toBe(true)
  expect(game.start).toBeGreaterThanOrEqual(0)
  //following it agrees with the solution
  const [i, v] = hint.place[0]
  expect(v).toBe(game.solution[i] ? FILL : CROSS)
  click(i, v === FILL ? left : right)
  expect(board()[i]).toBe(v)
  expect(now().hint).toBe(null)
})

it('has no expert 5x5, falling back to hard', () => {
  wired.reset({ n: 5, level: 3 })
  expect(now().game.level).toBe(2)
  expect(localStorage.getItem('nonograms.level')).toBe('2')
})

it('asks about a hint at once when the fills are all placed but wrong, unless a fill may be passing', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const wrong = almost()
  expect(now().prompt).toBe(false)
  //a right click back from a cross is settled
  click(wrong, right)
  click(wrong, right)
  expect(board()[wrong]).toBe(FILL)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().prompt).toBe(false)
  expect(now().hint.marks[wrong]).toBe('wrong')
})

it('asks a little later after a single fill, and not if the cell moves on to a cross', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const wrong = almost()
  click(wrong)
  expect(now().prompt).toBe(false)
  click(wrong)
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(false)
  click(wrong, right)
  vi.advanceTimersByTime(2500)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(false)
  expect(now().prompt).toBe(false)
  expect(now().hint).toBe(null)
})

it('wins and offers a best time, kept apart from hinted games', () => {
  const { solution } = now().game
  solution.forEach((v, i) => v && click(i))
  const { game, winner } = now()
  expect(winner).toMatchObject({ level: 'easy 5 × 5', hinted: false })
  wired.changeWinner({ name: ' Ada ' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('nonograms.5.0')).toBe(String(game.time))
  expect(localStorage.getItem('nonograms.name')).toBe('Ada')
  expect(now().bestTime.clean['5.0']).toMatchObject({ set: true, time: game.time, name: 'Ada' })
  expect(now().bestTime.hinted['5.0']).toMatchObject({ set: false, time: 999, name: 'Anonymous' })
  expect(localStorage.getItem('nonograms.5.0.date')).toMatch(/^\d{4}-\d\d-\d\d$/)
  wired.resetBestTime()
  expect(localStorage.getItem('nonograms.5.0')).toBe(null)
  expect(localStorage.getItem('nonograms.5.0.date')).toBe(null)
})

it('remembers the rain glyph choice and opens the help boxes', () => {
  wired.toggleRain()
  expect(now().rain).toBe(true)
  expect(localStorage.getItem('nonograms.rain')).toBe('yes')
  wired.toggleRain()
  expect(now().rain).toBe(false)
  wired.toggleHowTo()
  expect(now().howTo).toBe(true)
  wired.toggleAbout()
  expect(now().about).toBe(true)
})

it('keeps no best time with the timer off and shows dashes', () => {
  wired.toggleTimer()
  expect(now().timer).toBe(false)
  const { solution } = now().game
  solution.forEach((v, i) => v && click(i))
  expect(now().game.win).toBe(true)
  expect(now().winner).toBe(null)
  const blank = Digit({ value: 12, blank: true })
  expect(blank.children.map((digit) => digit.attributes['data-n'])).toEqual(['-', '-', '-'])
})

it('comes back to a game in progress paused, leaving out a half done stroke', () => {
  click(0)
  const kept = board()
  wired.down({ event: left, i: 1 })
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect([...back.board]).toEqual(kept)
  expect(back.clues).toEqual(now().game.clues)
  expect(back.history).toHaveLength(1)
  expect(back.stroke).toBe(null)
  start({ game: back, mode: FILL })
  wired.pause(false)
  wired.undo()
  expect(board().every((v) => v === EMPTY)).toBe(true)
})

//deals from the pool: the board arrives asynchronously
const dealtArt = async (payload) => {
  wired.reset(payload)
  await vi.waitFor(() => expect(now().game.dealing).toBe(false))
}

const solve = () => now().game.solution.forEach((v, i) => v && click(i))

it('deals pictures from the pool with procedural off, on a board of their own', async () => {
  wired.toggleProcedural()
  expect(localStorage.getItem('nonograms.procedural')).toBe('off')
  await dealtArt({ n: 5 })
  const { art } = now().game
  expect(art).toMatchObject({ licence: 'CC0' })
  expect(now().game.picked).toBe(false)
  solve()
  expect(now().winner).toMatchObject({ board: 'art' })
  expect(now().winner.key).toMatch(/^nonograms\.art\.5\.\d$/)
  expect(now().winner.text).toMatch(/fastest art time/)
  wired.submitBestTime({ preventDefault() {} })
  expect(now().bestTime.tab).toBe('art')
  expect(now().bestTime.art[`5.${art.level}`].time).toBe(now().game.time)
  expect(now().bestTime.clean[`5.${art.level}`].time).toBe(999)
  expect(now().solved).toContain(art.id)
})

it('keeps no time for a picture chosen by hand, and remembers it as solved', async () => {
  wired.toggleProcedural()
  wired.togglePictures()
  expect(now().pictures).toBe(true)
  wired.choosePicture('5/heart')
  await vi.waitFor(() => expect(now().game.dealing).toBe(false))
  expect(now().pictures).toBe(false)
  expect(now().game).toMatchObject({ picked: true, art: { id: '5/heart', name: 'Heart' } })
  solve()
  expect(now().game.win).toBe(true)
  expect(now().winner).toBe(null)
  expect(now().solved).toEqual(['5/heart'])
  expect(JSON.parse(localStorage.getItem('nonograms.solved'))).toEqual(['5/heart'])
})

it('remembers procedural and symmetric as asked, dealing a board for them', () => {
  expect(now()).toMatchObject({ procedural: true, symmetric: true })
  const before = now().game
  wired.toggleSymmetric()
  expect(now().symmetric).toBe(false)
  expect(now().game).not.toBe(before)
  expect(now().game.dealing).toBe(true)
  expect(localStorage.getItem('nonograms.symmetric')).toBe('off')
  wired.toggleSymmetric()
  expect(now().symmetric).toBe(true)
})

it('asks before a picture setting ends a game in play, and cancel keeps both', () => {
  click(0)
  const before = now().game
  wired.toggleProcedural()
  expect(now().switching).toEqual({ payload: { procedural: false } })
  wired.answerSwitch(null)
  expect(now()).toMatchObject({ procedural: true, switching: null })
  expect(now().game).toBe(before)
  expect(localStorage.getItem('nonograms.procedural')).toBe(null)
  wired.toggleProcedural()
  wired.answerSwitch('discard')
  expect(now().procedural).toBe(false)
  expect(now().game.dealing).toBe(true)
  expect(localStorage.getItem('nonograms.procedural')).toBe('off')
})

it('keeps its picture when the game is saved and restored', async () => {
  wired.toggleProcedural()
  await dealtArt({ n: 5 })
  click(0)
  const back = saved.restore()
  wired.peek()
  expect(back).toBe(null)
  wired.pause(true)
  vi.useFakeTimers()
  saved.keep({ ...now().game, paused: true })
  vi.useRealTimers()
  expect(saved.restore()?.art).toEqual(now().game.art)
})

it('shares the picture as a link that opens the same clues', () => {
  wired.share()
  const opened = gameOf(now().share.link.split('#play=')[1])
  expect(opened.clues).toEqual(now().game.clues)
  expect(Array.from(opened.solution).map((v) => v === FILL)).toEqual(
    Array.from(now().game.solution).map((v) => v === FILL),
  )
  expect(opened.shared).toBe(true)
  expect(gameOf('5.0.0')).toBe(null)
})

it('drops a half done stroke when the game pauses', () => {
  click(0)
  const before = board()
  wired.down({ event: left, i: 6 })
  wired.drag(8)
  expect(board()).not.toEqual(before)
  wired.pause(true)
  expect(now().game.stroke).toBe(null)
  expect(board()).toEqual(before)
  //the release that follows changes nothing, and play goes on after
  wired.up()
  wired.pause(false)
  clearTimeout(now().game.raf)
  click(6)
  expect(board()[6]).toBe(FILL)
})

it('plays from the keyboard: arrows move a cursor, space steps its cell, x crosses it', () => {
  const key = (keyCode) =>
    wired.press({ keyCode, target: { tagName: 'BODY' }, preventDefault() {} })
  key(32)
  expect(board().every((v) => v === EMPTY)).toBe(true)
  key(40)
  expect(now().cursor).toBe(12)
  key(37)
  key(38)
  expect(now().cursor).toBe(6)
  key(32)
  expect(board()[6]).toBe(FILL)
  key(32)
  expect(board()[6]).toBe(CROSS)
  key(88)
  expect(board()[6]).toBe(EMPTY)
  key(88)
  expect(board()[6]).toBe(CROSS)
  key(8)
  expect(board()[6]).toBe(EMPTY)
  //each key is its own undo step
  expect(now().game.history).toHaveLength(5)
  wired.undo()
  expect(board()[6]).toBe(CROSS)
  click(0)
  expect(now().cursor).toBe(-1)
  clearTimeout(now().game.raf)
})

it('marks the row and column under the mouse on the board, without drawing it again', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => (
      <div oncreate={resolve}>{view({ ...state, game: dealtGame() }, actions)}</div>
    )
    app(state, actions, testView, container)
  })
  const cell = container.querySelector('[data-cell="7"]')
  const field = cell.parentNode
  const boardEl = field.parentNode
  cell.dispatchEvent(new Event('pointermove', { bubbles: true }))
  expect(boardEl.dataset.hover).toBe('')
  //cell 7 of a 5x5 board is row 1, column 2, and tracks count from 1
  expect(boardEl.style.getPropertyValue('--hover-row')).toBe('2')
  expect(boardEl.style.getPropertyValue('--hover-column')).toBe('3')
  field.dispatchEvent(new Event('pointerleave'))
  expect(boardEl.dataset.hover).toBeUndefined()
})
