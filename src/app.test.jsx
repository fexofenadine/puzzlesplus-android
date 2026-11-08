import { beforeEach, expect, it } from 'vitest'
import { app, h } from 'hyperapp'
import { state, actions, view, saved } from './app'
import { solvable } from './mines'
import { clock } from './shell/clock'
import { windowClear } from './shell/actions'

it('renders without crashing', async () => {
  const container = document.createElement('div')
  await new Promise((resolve) => {
    const testView = () => <div oncreate={resolve}>{view(state, actions)}</div>
    app(state, actions, testView, container)
  })
})

//9x9 board with a flagged mine at the top left, a wall of mines in column 4
//and the 1 at x=1 y=1 already opened, so it is ready to chord
const chordGame = (flagged = true) => {
  const field = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 9 }, (_, x) => ({
      opened: false,
      mined: (x === 0 && y === 0) || x === 4,
      flag: false,
      mark: false,
      num: 0,
    })),
  )
  field[0][0].flag = flagged
  field[1][1].opened = true
  field[1][1].num = 1
  return {
    ...state.game,
    width: 9,
    height: 9,
    mines: 10,
    field,
    left: 81 - 10 - 1,
    flags: 9,
    start: 0,
    time: 1,
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

beforeEach(() => start({ game: chordGame() }))

const game = () => {
  wired.peek()
  return current.game
}

const neighbours = [
  [0, 1],
  [1, 0],
  [2, 0],
  [0, 2],
  [2, 1],
  [1, 2],
  [2, 2],
]

it('double click on a satisfied number opens its unflagged neighbours', () => {
  wired.chord({ x: 1, y: 1 })
  const { field, lose } = game()
  expect(lose).toBe(false)
  for (const [x, y] of neighbours) expect(field[y][x].opened).toBe(true)
  expect(field[0][0].opened).toBe(false)
})

it('double click does nothing when the flags do not match the number', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  expect(
    game()
      .field.flat()
      .filter((c) => c.opened),
  ).toHaveLength(1)
})

it('tap on a satisfied number opens its unflagged neighbours', () => {
  const cell = document.createElement('button')
  document.elementFromPoint = (x, y) => (x < 16 && y < 16 ? cell : null)
  wired.touch({ event: { currentTarget: cell }, x: 1, y: 1 })
  const end = new Event('touchend')
  end.changedTouches = [{ clientX: 8, clientY: 8 }]
  window.dispatchEvent(end)
  delete document.elementFromPoint
  const { field, lose } = game()
  expect(lose).toBe(false)
  for (const [x, y] of neighbours) expect(field[y][x].opened).toBe(true)
})

const firstClick = (settings, x = 4, y = 4) => {
  start(settings)
  wired.down({ event: { button: 0, buttons: 1 }, x, y })
  wired.up()
  return game()
}

it('safe first click never loses on the first click', () => {
  for (let run = 0; run < 100; run++) {
    expect(firstClick({ safeStart: true, noGuess: false }).lose).toBe(false)
  }
})

it('flagging or chording before the first click does not start the game', () => {
  start({ safeStart: true, noGuess: true })
  wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
  wired.up()
  wired.down({ event: { button: 0, buttons: 1, shiftKey: true }, x: 8, y: 8 })
  wired.up()
  const { start: began, field } = game()
  expect(began).toBe(-1)
  expect(field.flat().some((c) => c.mined)).toBe(false)
  expect(field[0][0].flag).toBe(true)
})

it('no guessing deals a solvable board from the first opened cell after a flag', () => {
  for (let run = 0; run < 20; run++) {
    start({ safeStart: false, noGuess: true })
    wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
    wired.up()
    wired.down({ event: { button: 0, buttons: 1 }, x: 6, y: 6 })
    wired.up()
    const { field, width, height, lose } = game()
    expect(lose).toBe(false)
    expect(field[6][6].num).toBe(0)
    const mined = Uint8Array.from(field.flat(), (c) => (c.mined ? 1 : 0))
    expect(solvable(mined, width, height, 6 * width + 6)).toBe(true)
  }
})

it('no guessing opens an area on the first click and deals a solvable board', () => {
  for (let run = 0; run < 20; run++) {
    const { field, width, height, lose } = firstClick({ safeStart: false, noGuess: true })
    expect(lose).toBe(false)
    expect(field[4][4].num).toBe(0)
    const mined = Uint8Array.from(field.flat(), (c) => (c.mined ? 1 : 0))
    expect(solvable(mined, width, height, 4 * width + 4)).toBe(true)
  }
})

it('a win flags every mine left and empties the mine counter', () => {
  const won = chordGame(false)
  won.field.flat().forEach((c) => (c.opened = !c.mined))
  won.field[2][2].opened = false
  won.field[3][4].mark = true
  start({ game: { ...won, left: 1, flags: 10 } })
  wired.down({ event: { button: 0, buttons: 1 }, x: 2, y: 2 })
  wired.up()
  const { field, flags, win } = game()
  expect(win).toBe(true)
  expect(flags).toBe(0)
  for (const c of field.flat()) {
    expect(c.flag).toBe(c.mined)
    expect(c.mark).toBe(false)
  }
})

it('asking for a hint marks the game as hinted and shows the reasoning', () => {
  wired.hint()
  wired.peek()
  expect(current.game.hinted).toBe(true)
  expect(current.hint.text).toBeTruthy()
})

it('a hint before the first click does not count as used', () => {
  start({ game: { ...chordGame(), start: -1 } })
  wired.hint()
  expect(game().hinted).toBe(false)
})

it('keeps best times with and without hints apart', () => {
  localStorage.clear()
  const finish = (hinted, time) => {
    start({ game: { ...chordGame(), level: 'beginner', hinted, time } })
    wired.win()
    wired.submitBestTime({ preventDefault() {} })
    wired.peek()
  }
  finish(false, 90)
  finish(true, 50)
  expect(localStorage.getItem('beginner')).toBe('90')
  expect(localStorage.getItem('beginnerHints')).toBe('50')
  expect(current.bestTime.tab).toBe('hinted')
  expect(current.bestTime.clean[0].time).toBe(90)
  expect(current.bestTime.hinted[0].time).toBe(50)
  wired.resetBestTime()
  wired.peek()
  expect(current.bestTime.hinted[0].time).toBe(999)
  expect(current.bestTime.clean[0].time).toBe(90)
  localStorage.clear()
})

it('ignores shortcut keys while typing or with a modifier held', () => {
  start({ game: chordGame() })
  const key = (keyCode, extra) => wired.press({ keyCode, target: { tagName: 'BODY' }, ...extra })
  key(78, { target: { tagName: 'INPUT' } })
  key(78, { ctrlKey: true })
  key(72, { ctrlKey: true })
  expect(game().start).toBe(0)
  expect(current.hint).toBe(null)
  key(72)
  expect(game().hinted).toBe(true)
  //a game in play asks before it is replaced
  key(78)
  expect(game().start).toBe(0)
  expect(current.switching).toEqual({ payload: undefined })
  wired.answerSwitch('discard')
  expect(game().start).toBe(-1)
  expect(current.switching).toBe(null)
})

it('explains a chord on a number without enough flags', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  wired.peek()
  expect(current.hint.text).toMatch(
    /This 1 has none, so flag 1 more mine among the highlighted cells first/,
  )
  expect(current.hint.marks[1 * 9 + 1]).toBe('source')
  expect(current.hint.marks[0]).toBe('unsure')
  expect(game().hinted).toBe(false)
})

it('explains a chord on a number with too many flags', () => {
  const extra = chordGame()
  extra.field[0][1].flag = true
  start({ game: extra })
  wired.chord({ x: 1, y: 1 })
  wired.peek()
  expect(current.hint.text).toMatch(/touches 2 flags/)
  expect(current.hint.marks[0]).toBe('wrong')
  expect(current.hint.marks[1]).toBe('wrong')
})

it('explains a failed chord with both buttons', () => {
  start({ game: chordGame(false) })
  wired.down({ event: { button: 0, buttons: 3 }, x: 1, y: 1 })
  wired.up()
  wired.peek()
  expect(current.hint.text).toMatch(/Chording needs exactly/)
})

it('does not call the double click that opened a number a failed chord', () => {
  start({ game: chordGame(false) })
  wired.down({ event: { button: 0, buttons: 1 }, x: 3, y: 2 })
  wired.up()
  expect(game().field[2][3].num).toBe(3)
  wired.chord({ x: 3, y: 2 })
  wired.peek()
  expect(current.hint).toBe(null)
})

it('previews background settings live and only saves them on OK', () => {
  localStorage.clear()
  start({ theme: 'nord' })
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings.id).toBe('substrate')
  wired.changeBackgroundSettings({ maxCracks: 50 })
  wired.peek()
  expect(current.backgroundSettings.draft.maxCracks).toBe(50)
  expect(current.backgrounds.substrate.maxCracks).toBe(100)
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings).toBe(null)
  expect(localStorage.getItem('backgrounds')).toBe(null)

  wired.toggleBackgroundSettings()
  wired.changeBackgroundSettings({ wireframe: true })
  wired.submitBackgroundSettings({ preventDefault() {} })
  wired.peek()
  expect(current.backgrounds.substrate.wireframe).toBe(true)
  const stored = JSON.parse(localStorage.getItem('backgrounds'))
  expect(stored.substrate.wireframe).toBe(true)
  expect(stored.matrix.density).toBe(44)

  wired.toggleBackgroundSettings()
  wired.resetBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings.draft.wireframe).toBe(false)
  localStorage.clear()
})

it('has only the window opacity for themes without a background', () => {
  start({ theme: 'synthwave' })
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(current.backgroundSettings).toEqual({ id: null, draft: {}, opacity: 100 })
})

it('fades the game window as a preview, keeps it on ok and hides it whole', () => {
  start({ theme: 'synthwave' })
  expect(windowClear(current)).toBe(null)
  wired.toggleBackgroundSettings()
  wired.changeOpacity(40)
  wired.peek()
  expect(windowClear(current)).toBe(40)
  //cancel puts it back
  wired.toggleBackgroundSettings()
  wired.peek()
  expect(windowClear(current)).toBe(null)
  wired.toggleBackgroundSettings()
  wired.changeOpacity(40)
  wired.submitBackgroundSettings({ preventDefault: () => {} })
  wired.peek()
  expect(current.glass.opacity).toBe(40)
  wired.toggleHideWindow()
  wired.peek()
  expect(windowClear(current)).toBe(0)
  wired.toggleHideWindow()
  wired.peek()
  expect(windowClear(current)).toBe(40)
})

it('has an extreme level at expert density, 30% wider and taller', () => {
  start({})
  wired.reset({ level: 'extreme' })
  const { width, height, mines } = game()
  expect([width, height, mines]).toEqual([39, 21, 169])
  expect(Math.abs(mines / (width * height) - 99 / (30 * 16))).toBeLessThan(0.001)
  expect(current.game.field.flat()).toHaveLength(39 * 21)
})

it('zooms in steps from the size shown and remembers the choice', () => {
  localStorage.clear()
  start({ zoom: { chosen: 1, scale: 0.8, seen: null } })
  wired.zoom(1)
  wired.peek()
  expect(current.zoom).toMatchObject({ chosen: 0.875, scale: 0.875 })
  expect(localStorage.getItem('scale')).toBe('0.875')
  wired.zoom(0)
  wired.peek()
  expect(current.zoom).toMatchObject({ chosen: 1, scale: 1 })
  localStorage.clear()
})

it('shows 999 for an empty best time and a record past 999 as it is', () => {
  localStorage.clear()
  localStorage.setItem('intermediate', '1200')
  wired.toggleBestTime()
  wired.peek()
  const times = Object.fromEntries(current.bestTime.clean.map(({ level, time }) => [level, time]))
  expect(times.beginner).toBe(999)
  expect(times.intermediate).toBe(1200)
  localStorage.clear()
})

it('steps the zoom with + and -, and leaves maximised when it does', () => {
  localStorage.clear()
  start({ zoom: { chosen: 1, scale: 1.4, seen: null, maximised: true } })
  wired.press({ key: '+', keyCode: 187, target: { tagName: 'BODY' } })
  wired.peek()
  expect(current.zoom).toMatchObject({ chosen: 1.5, scale: 1.5, maximised: false })
  wired.press({ key: '-', keyCode: 189, target: { tagName: 'BODY' } })
  wired.peek()
  expect(current.zoom.chosen).toBe(1.25)
  localStorage.clear()
})

it('minimises to the taskbar paused, and its taskbar button brings it back still paused', () => {
  wired.minimise()
  wired.peek()
  expect(current.windowState).toBe('minimised')
  expect(current.game.paused).toBe(true)
  //a hidden window ignores the game's shortcuts
  wired.press({ keyCode: 78, target: { tagName: 'BODY' } })
  expect(game().start).toBe(0)
  wired.taskbarGame('minesweeper')
  wired.peek()
  expect(current.windowState).toBe('open')
  expect(current.game.paused).toBe(true)
  wired.taskbarGame('minesweeper')
  wired.peek()
  expect(current.windowState).toBe('minimised')
})

it('closing ends the game and offers every game, picking this one opens a fresh game', () => {
  wired.close()
  wired.peek()
  //a game in play asks first, keeping playing leaves the window open
  if (current.switching) {
    expect(current.windowState).toBe('open')
    wired.answerSwitch(null)
    wired.peek()
    expect(current.windowState).toBe('open')
    wired.close()
    wired.answerSwitch('discard')
    wired.peek()
  }
  expect(current.windowState).toBe('closed')
  expect(current.openGames).toBe('minesweeper')
  expect(current.game.start).toBe(-1)
  wired.selectGame('takuzu')
  wired.peek()
  expect(current.openGames).toBe('takuzu')
  wired.openGame('minesweeper')
  wired.peek()
  expect(current.openGames).toBe(null)
  expect(current.windowState).toBe('open')
})

it('shows a wide board transposed on a portrait screen, keeping each cell its own place', () => {
  const container = document.createElement('div')
  const cellsOf = (portrait) =>
    new Promise((resolve) => {
      const shown = { ...state, game: chordGame(), portrait }
      shown.game.field = shown.game.field.slice(0, 3)
      shown.game.height = 3
      const testView = () => (
        <div
          oncreate={(el) => {
            const rows = [...el.querySelectorAll('[class*=active]')]
            resolve(rows.map((row) => row.children.length))
          }}
        >
          {view(shown, actions)}
        </div>
      )
      app(shown, actions, testView, container)
    })
  return Promise.all([cellsOf(false), cellsOf(true)]).then(([wide, tall]) => {
    expect(wide).toEqual([9, 9, 9])
    expect(tall).toEqual(Array(9).fill(3))
  })
})

it('keeps an explanation through clicks that change nothing, and clears it when the board changes', () => {
  start({ game: chordGame(false) })
  wired.chord({ x: 1, y: 1 })
  wired.down({ event: { button: 0, buttons: 1 }, x: 1, y: 1 })
  wired.up()
  wired.peek()
  expect(current.hint).not.toBe(null)
  wired.down({ event: { button: 2, buttons: 2 }, x: 0, y: 0 })
  wired.peek()
  expect(current.hint).toBe(null)
})

it('calls the window Minesweeper on classic and Minesweeper Plus on the other themes', async () => {
  const titleOf = (theme) =>
    new Promise((resolve) => {
      const container = document.createElement('div')
      const testView = () => (
        <div oncreate={(el) => resolve(el.querySelector('h1').textContent)}>
          {view({ ...state, theme }, actions)}
        </div>
      )
      app({ ...state, theme }, actions, testView, container)
    })
  expect(await titleOf('classic')).toBe('Minesweeper')
  for (const theme of ['synthwave', 'matrix', 'nord', 'solarized', 'solarized-phosphor']) {
    expect(await titleOf(theme)).toBe('Minesweeper Plus')
  }
})

it('opens and closes the about box', () => {
  start({})
  wired.toggleAbout()
  wired.peek()
  expect(current.about).toBe(true)
  wired.toggleAbout()
  wired.peek()
  expect(current.about).toBe(false)
})

it('pauses the clock and picks up from the same time', () => {
  start({ game: { ...chordGame(), time: 5 } })
  wired.pause()
  const paused = game()
  expect(paused.paused).toBe(true)
  wired.pause()
  const resumed = game()
  expect(resumed.paused).toBe(false)
  expect(resumed.start).toBeGreaterThan(paused.start)
  expect(resumed.start - paused.start).toBeCloseTo(clock() - paused.pausedAt, -2)
})

it('ignores clicks, chords and hints while paused', () => {
  wired.pause()
  wired.down({ event: { button: 0, buttons: 1 }, x: 3, y: 2 })
  wired.up()
  wired.chord({ x: 1, y: 1 })
  wired.hint()
  const { field, hinted } = game()
  expect(field.flat().filter((c) => c.opened)).toHaveLength(1)
  expect(hinted).toBe(false)
})

it('only pauses a game that is running', () => {
  start({ game: { ...chordGame(), start: -1 } })
  wired.pause()
  expect(game().paused).toBe(false)
  start({ game: { ...chordGame(), win: true } })
  wired.pause(true)
  expect(game().paused).toBe(false)
})

it('pauses on p and leaves a paused game paused when told to pause', () => {
  wired.press({ keyCode: 80, target: { tagName: 'BODY' } })
  expect(game().paused).toBe(true)
  wired.pause(true)
  expect(game().paused).toBe(true)
})

it('esc shows the spreadsheet and pauses, and only esc takes it away', () => {
  const key = (keyCode) => wired.press({ keyCode, target: { tagName: 'BODY' } })
  key(27)
  wired.peek()
  expect(current.boss.rows).toHaveLength(10)
  expect(current.game.paused).toBe(true)
  key(78)
  key(80)
  wired.peek()
  expect(current.boss).not.toBe(null)
  expect(current.game.start).toBe(0)
  key(27)
  wired.peek()
  expect(current.boss).toBe(null)
  expect(current.game.paused).toBe(true)
})

it('hides the board while paused and covers the page with the spreadsheet', () =>
  new Promise((resolve) => {
    const container = document.createElement('div')
    const shown = { ...state, game: { ...chordGame(), paused: true }, boss: { rows: [] } }
    shown.game.field[0][0].flag = true
    const testView = () => (
      <div
        oncreate={(el) => {
          expect(el.querySelectorAll('[class*=flag]')).toHaveLength(0)
          expect(el.querySelector('[title="Resume (P)"]')).not.toBe(null)
          expect(document.title).toBe('Q3 budget')
          expect(document.documentElement.dataset.boss).toBe('true')
          resolve()
        }}
      >
        {view(shown, actions)}
      </div>
    )
    app(shown, actions, testView, container)
  }))

it('esc closes an open menu before it shows the spreadsheet', () => {
  start({ game: chordGame(), menu: { game: true } })
  const esc = () => wired.press({ keyCode: 27, target: { tagName: 'BODY' } })
  esc()
  wired.peek()
  expect(current.menu).toBe(null)
  expect(current.boss).toBe(null)
  esc()
  wired.peek()
  expect(current.boss).not.toBe(null)
})

it('has a hint button by the face on every theme but classic', async () => {
  const hintButtons = (theme) =>
    new Promise((resolve) => {
      const container = document.createElement('div')
      const testView = () => (
        <div oncreate={(el) => resolve(el.querySelectorAll('[title="Hint (H)"]').length)}>
          {view({ ...state, theme }, actions)}
        </div>
      )
      app({ ...state, theme }, actions, testView, container)
    })
  expect(await hintButtons('classic')).toBe(0)
  for (const theme of ['synthwave', 'matrix', 'nord', 'solarized', 'solarized-phosphor']) {
    expect(await hintButtons(theme)).toBe(1)
  }
})

it('comes back to a game in progress paused, mines and flags and all', () => {
  wired.down({ event: { button: 2, buttons: 2 }, x: 8, y: 8 })
  wired.up()
  const before = game()
  saved.keep(before)
  const back = saved.restore()
  expect(back.paused).toBe(true)
  expect(back.field).toEqual(before.field)
  expect(back.flags).toBe(before.flags)
  expect(back.left).toBe(before.left)
  start({ game: back })
  wired.pause(false)
  expect(game().paused).toBe(false)
  wired.chord({ x: 1, y: 1 })
  expect(game().field[1][0].opened).toBe(true)
})

it('forgets the saved game once it is lost, and keeps no best time with the timer off', () => {
  saved.keep(game())
  expect(localStorage.getItem('savedGame')).not.toBe(null)
  wired.down({ event: { button: 0, buttons: 1 }, x: 4, y: 4 })
  wired.up()
  expect(game().lose).toBe(true)
  saved.keep(game())
  expect(localStorage.getItem('savedGame')).toBe(null)
  start({ game: chordGame(), timer: false })
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (x !== 4 && !(x === 0 && y === 0)) {
        wired.down({ event: { button: 0, buttons: 1 }, x, y })
        wired.up()
      }
    }
  }
  wired.peek()
  expect(current.game.win).toBe(true)
  expect(current.winner).toBe(null)
})
