import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, gameOf, saved } from './app'
import { EMPTY, bit, pairsOf } from './rules'
import { makeGame, random } from './generate'

//a dealt 5x5 board, ready to play
const dealtGame = (seed = 5, level = 1) => {
  const { givens, right, down, solution } = makeGame(5, level, random(seed))
  return {
    ...createGame({ n: 5, level }),
    givens,
    right,
    down,
    solution,
    board: givens.slice(),
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
const key = (keyCode, extra = {}) =>
  wired.press({ keyCode, target: { tagName: 'BODY' }, preventDefault() {}, ...extra })

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame(), selected: -1, picked: 0, noting: false, tidy: true, timer: true })
})

const emptyCells = () => [...now().game.board.keys()].filter((i) => now().game.board[i] === EMPTY)

//types the solution into every empty cell but skip
const fill = (skip = -1) => {
  for (const i of emptyCells()) {
    if (i === skip) continue
    wired.tap({ event: left, i })
    key(48 + now().game.solution[i])
  }
}

it('renders a board with its signs without crashing', async () => {
  const container = document.createElement('div')
  const shown = { ...state, game: dealtGame() }
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(shown, actions)}</div>
    app(shown, actions, testView, container)
  })
  expect(container.querySelectorAll('[data-cell]').length).toBe(25)
  const signs = container.querySelectorAll('[class*=sign], [class*=turned]')
  expect(signs.length).toBe(pairsOf(shown.game).length)
})

it('puts a typed digit in the selected cell, and tidies it out of its row and column notes', () => {
  const [i] = emptyCells()
  const digit = now().game.solution[i]
  const row = emptyCells().find((c) => c !== i && Math.floor(c / 5) === Math.floor(i / 5))
  const other = emptyCells().find((c) => c % 5 !== i % 5 && Math.floor(c / 5) !== Math.floor(i / 5))
  for (const c of [row, other]) {
    wired.tap({ event: left, i: c })
    key(48 + digit, { shiftKey: true })
  }
  expect(now().game.notes[row]).toBe(bit(digit))
  wired.tap({ event: left, i })
  key(48 + digit)
  expect(now().game.board[i]).toBe(digit)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  //the note in its row goes, the one elsewhere stays
  expect(now().game.notes[row]).toBe(0)
  expect(now().game.notes[other]).toBe(bit(digit))
  wired.undo()
  expect(now().game.board[i]).toBe(EMPTY)
  expect(now().game.notes[row]).toBe(bit(digit))
  clearTimeout(now().game.raf)
})

it('wins on the solution and offers a best time', () => {
  fill()
  const { game, winner } = now()
  expect(game.win).toBe(true)
  expect(winner).toMatchObject({ level: 'medium 5 × 5', hinted: false })
  wired.changeWinner({ name: 'Ada' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('futoshiki.5.1')).toBe(String(game.time))
})

it('asks about a hint when the board is full but a sign is broken, and the hint finds it', () => {
  const [small, big] = pairsOf(now().game).find(
    ([a, b]) => now().game.givens[a] === EMPTY && now().game.givens[b] === EMPTY,
  )
  fill(small)
  //the digit of the larger cell, or anything above it, breaks the sign
  wired.tap({ event: left, i: small })
  key(48 + now().game.solution[big])
  expect(now().game.win).toBe(false)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().hint.kind).toBe('break')
  expect(now().hint.marks[small]).toBe('wrong')
  clearTimeout(now().game.raf)
})

it('comes back to a game in progress paused, signs and notes and all', () => {
  const [i, j] = emptyCells()
  wired.tap({ event: left, i })
  key(48 + now().game.solution[i])
  wired.tap({ event: left, i: j })
  key(49, { shiftKey: true })
  clearTimeout(now().game.raf)
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(back.board[i]).toBe(now().game.solution[i])
  expect(back.notes[j]).toBe(bit(1))
  expect([...back.right]).toEqual([...now().game.right])
  expect([...back.down]).toEqual([...now().game.down])
  //a save without its signs doesn't fit
  const kept = JSON.parse(localStorage.getItem('futoshiki.saved'))
  delete kept.game.right
  localStorage.setItem('futoshiki.saved', JSON.stringify(kept))
  expect(saved.restore()).toBe(null)
})

it('shares the digits and signs as a link that opens the same board, and refuses a bad one', () => {
  const { game } = now()
  wired.share()
  const code = /#play=([\w.]+)$/.exec(now().share.link)[1]
  const linked = gameOf(code)
  expect([...linked.givens]).toEqual([...game.givens])
  expect([...linked.right]).toEqual([...game.right])
  expect([...linked.down]).toEqual([...game.down])
  expect([...linked.solution]).toEqual([...game.solution])
  expect(linked.shared).toBe(true)
  //an empty board has many answers, and sizes that are not dealt are refused
  expect(gameOf('5.1.0')).toBe(null)
  expect(gameOf('9.1.0')).toBe(null)
  expect(gameOf('4.2.0')).toBe(null)
})

it('deals the daily puzzle at 6 x 6 medium and leaves the saved choice alone', () => {
  wired.reset({ daily: true })
  expect(now().game).toMatchObject({ n: 6, level: 1, dealing: true })
  expect(localStorage.getItem('futoshiki.size')).toBe(null)
})

it('has no hard 4 x 4, falling back to medium', () => {
  wired.reset({ n: 4, level: 2 })
  expect(now().game).toMatchObject({ n: 4, level: 1 })
})
