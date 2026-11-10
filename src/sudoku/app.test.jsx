import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, createGame, gameOf, saved } from './app'
import { EMPTY, bit, candidatesOf, geometry } from './rules'
import { makeGame, random } from './generate'
import { apply, nextSteps } from './techniques'
import { findHint } from './hint'

//a dealt easy board, ready to play
const dealtGame = (seed = 5, level = 0) => {
  const { givens, solution } = makeGame(9, level, random(seed))
  return {
    ...createGame({ n: 9, level }),
    givens,
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
const right = { button: 2 }
const key = (keyCode, extra = {}) =>
  wired.press({ keyCode, target: { tagName: 'BODY' }, preventDefault() {}, ...extra })

beforeEach(() => {
  localStorage.clear()
  start({ game: dealtGame(), selected: -1, picked: 0, noting: false, tidy: true, timer: true })
})

const emptyCells = () => [...now().game.board.keys()].filter((i) => now().game.board[i] === EMPTY)
const given = () => now().game.givens.findIndex((d) => d !== EMPTY)

it('renders and deals a board without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
  expect(container.querySelectorAll('[data-cell]').length).toBe(81)
})

it('selects a cell and puts a pad digit or a typed one in it, the same digit taking it out', () => {
  const [i] = emptyCells()
  wired.tap({ event: left, i })
  expect(now().selected).toBe(i)
  wired.pad({ d: 3 })
  expect(now().game.board[i]).toBe(3)
  expect(now().game.start).toBeGreaterThanOrEqual(0)
  key(55)
  expect(now().game.board[i]).toBe(7)
  key(103)
  expect(now().game.board[i]).toBe(EMPTY)
  //tapping the selected cell again lets it go
  wired.tap({ event: left, i })
  expect(now().selected).toBe(-1)
})

it('never changes a clue, and picks the digit instead for tapping cells', () => {
  const g = given()
  wired.tap({ event: left, i: g })
  wired.pad({ d: 4 })
  expect(now().game.board[g]).toBe(now().game.givens[g])
  expect(now().picked).toBe(4)
  expect(now().selected).toBe(-1)
  const [a, b] = emptyCells()
  wired.tap({ event: left, i: a })
  wired.tap({ event: right, i: b })
  expect(now().game.board[a]).toBe(4)
  expect(now().game.notes[b]).toBe(bit(4))
  //picking it again puts it down
  wired.pad({ d: 4 })
  expect(now().picked).toBe(0)
})

it('makes notes with shift, the notes switch or space, and tidies them as digits go in', () => {
  const [i] = emptyCells()
  const peer = geometry(9).peers[i].find((p) => now().game.board[p] === EMPTY)
  wired.tap({ event: left, i: peer })
  key(53, { shiftKey: true })
  expect(now().game.notes[peer]).toBe(bit(5))
  wired.tap({ event: left, i })
  key(32)
  expect(now().noting).toBe(true)
  wired.pad({ d: 5 })
  wired.pad({ d: 6 })
  expect(now().game.notes[i]).toBe(bit(5) | bit(6))
  wired.pad({ d: 6 })
  expect(now().game.notes[i]).toBe(bit(5))
  wired.toggleNoting()
  wired.pad({ d: 5 })
  expect(now().game.board[i]).toBe(5)
  expect(now().game.notes[peer]).toBe(0)
  //one undo brings back the digit's cell and the tidied note together
  wired.undo()
  expect(now().game.board[i]).toBe(EMPTY)
  expect(now().game.notes[peer]).toBe(bit(5))
  //and one redo places the digit and tidies the note again
  wired.redo()
  expect(now().game.board[i]).toBe(5)
  expect(now().game.notes[peer]).toBe(0)
})

it('leaves notes alone when tidying is off', () => {
  start({ game: dealtGame(), tidy: false, selected: -1, picked: 0 })
  const [i] = emptyCells()
  const peer = geometry(9).peers[i].find((p) => now().game.board[p] === EMPTY)
  wired.tap({ event: left, i: peer })
  wired.pad({ d: 2, note: true })
  wired.tap({ event: left, i })
  wired.pad({ d: 2 })
  expect(now().game.notes[peer]).toBe(bit(2))
})

it('erases a digit first, then the notes', () => {
  const [i] = emptyCells()
  wired.tap({ event: left, i })
  wired.pad({ d: 2, note: true })
  wired.pad({ d: 8 })
  key(8)
  expect(now().game.board[i]).toBe(EMPTY)
  expect(now().game.notes[i]).toBe(bit(2))
  key(46)
  expect(now().game.notes[i]).toBe(0)
})

it('moves the selection with the arrows, from the centre and not off the board', () => {
  key(37)
  expect(now().selected).toBe(40)
  key(38)
  expect(now().selected).toBe(31)
  for (let k = 0; k < 9; k++) key(39)
  expect(now().selected).toBe(35)
})

it('fills every empty cell with its candidates as notes', () => {
  wired.autoNotes()
  const cands = candidatesOf(now().game.board, 9)
  for (const i of emptyCells()) expect(now().game.notes[i]).toBe(cands[i])
  wired.undo()
  expect(now().game.notes.every((m) => m === 0)).toBe(true)
})

const fill = (digits, skip = -1) => {
  for (const i of emptyCells()) {
    if (i === skip) continue
    wired.tap({ event: left, i })
    wired.pad({ d: digits[i] })
    wired.tap({ event: left, i })
  }
}

it('wins on the solution and offers a best time', () => {
  fill(now().game.solution)
  const { game, winner } = now()
  expect(game.win).toBe(true)
  expect(winner).toMatchObject({ level: 'easy 9 × 9', hinted: false })
  wired.changeWinner({ name: 'Ada' })
  wired.submitBestTime({ preventDefault() {} })
  expect(localStorage.getItem('sudoku.9.0')).toBe(String(game.time))
})

it('keeps no best time with the timer off', () => {
  wired.toggleTimer()
  fill(now().game.solution)
  expect(now().game.win).toBe(true)
  expect(now().winner).toBe(null)
})

it('asks about a hint when the board is full but wrong', () => {
  const { solution } = now().game
  const [first] = emptyCells()
  const wrong = solution.slice()
  wrong[first] = (solution[first] % 9) + 1
  fill(wrong)
  expect(now().game.win).toBe(false)
  expect(now().prompt).toBe(true)
  wired.answerPrompt(true)
  expect(now().hint.kind).toBe('break')
  expect(now().game.hinted).toBe(true)
})

it('ignores the board while paused', () => {
  const [i] = emptyCells()
  wired.tap({ event: left, i })
  wired.pad({ d: 1 })
  wired.pause()
  wired.pad({ d: 2 })
  wired.erase()
  wired.hint()
  expect(now().game.board[i]).toBe(1)
  expect(now().hint).toBe(null)
})

it('comes back to a game in progress paused, notes and all', () => {
  const [i, j] = emptyCells()
  wired.tap({ event: left, i })
  wired.pad({ d: 6 })
  wired.tap({ event: right, i: j })
  wired.pad({ d: 3, note: true })
  saved.keep(now().game)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(back.board[i]).toBe(6)
  expect(back.notes[j]).toBe(bit(3))
  expect(back.history).toHaveLength(2)
  start({ game: back, selected: -1, picked: 0 })
  wired.pause(false)
  wired.undo()
  expect(now().game.notes[j]).toBe(0)
})

it('points at a wrong digit, at notes that leave out the answer, then explains the next digit', () => {
  const { solution } = now().game
  const [i, j] = emptyCells()
  wired.tap({ event: left, i })
  //a digit that breaks no rule but isn't the answer
  const peersHave = new Set(geometry(9).peers[i].map((p) => now().game.board[p]))
  const wrong = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((d) => d !== solution[i] && !peersHave.has(d))
  wired.pad({ d: wrong })
  wired.hint()
  expect(now().hint.kind).toBe('wrong')
  expect(now().hint.marks[i]).toBe('wrong')
  wired.erase()
  wired.tap({ event: left, i: j })
  wired.pad({ d: (solution[j] % 9) + 1, note: true })
  wired.hint()
  expect(now().hint.kind).toBe('note')
  wired.erase()
  wired.hint()
  const { hint } = now()
  expect(['hidden-single', 'naked-single']).toContain(hint.kind)
  const [[c, d]] = hint.place
  expect(solution[c]).toBe(d)
  expect(hint.marks[c]).toBe('place')
})

it('explains the removal that opens up the next digit on a harder board', () => {
  //play a medium board's singles until only a medium technique can carry on
  const { givens, solution } = makeGame(9, 1, random(11))
  const board = givens.slice()
  const cands = candidatesOf(board, 9)
  for (;;) {
    const { level, steps } = nextSteps(board, cands, 9)
    if (level > 0) break
    apply(board, cands, 9, steps)
  }
  const hint = findHint({ board, notes: new Int32Array(81), solution, n: 9 })
  expect(['pointing', 'claiming', 'naked-pair', 'hidden-pair']).toContain(hint.kind)
  expect(hint.text).toMatch(/ Then /)
  const [[c, d]] = hint.place
  expect(solution[c]).toBe(d)
  expect(Object.values(hint.marks)).toContain('remove')
})

it('shares the board as a link that opens the same clues on every size', () => {
  for (const n of [4, 6, 9]) {
    const { givens, solution } = makeGame(n, 0, random(3))
    const game = { ...createGame({ n, level: 0 }), givens, solution, board: givens.slice() }
    start({ game: { ...game, dealing: false } })
    wired.share()
    const opened = gameOf(now().share.link.split('#play=')[1])
    expect(opened.n).toBe(n)
    expect(Array.from(opened.givens)).toEqual(Array.from(givens))
    expect(Array.from(opened.solution)).toEqual(Array.from(solution))
    wired.closeShare()
  }
  //a board with a repeat or more than one solution is no puzzle
  expect(gameOf('4.0.0')).toBe(null)
  expect(gameOf('5.0.0')).toBe(null)
})
