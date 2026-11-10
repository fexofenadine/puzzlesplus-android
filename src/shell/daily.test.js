import { beforeEach, expect, it } from 'vitest'
import { dayBefore, dayOf, readDaily, seedOf, solveDaily } from './daily'
import { exportData, importData, ours, readBackup } from './backup'
import { codeOf, pack, partsOf, unpack } from './share'
import { load, save } from './storage'

beforeEach(() => localStorage.clear())

it('names days by the local calendar and steps back across months and years', () => {
  expect(dayOf(new Date(2026, 10, 11, 23, 59))).toBe('2026-11-11')
  expect(dayBefore('2026-11-01')).toBe('2026-10-31')
  expect(dayBefore('2027-01-01')).toBe('2026-12-31')
  expect(dayBefore('2028-03-01')).toBe('2028-02-29')
})

it('gives each day and game its own seed, the same every time', () => {
  expect(seedOf('2026-11-11', 'takuzu')).toBe(seedOf('2026-11-11', 'takuzu'))
  const seeds = new Set([
    seedOf('2026-11-11', 'takuzu'),
    seedOf('2026-11-12', 'takuzu'),
    seedOf('2026-11-11', 'sudoku'),
  ])
  expect(seeds.size).toBe(3)
})

it('counts a streak of days in a row, once a day, and keeps the fastest time', () => {
  expect(readDaily('takuzu', '2026-11-11')).toEqual({
    done: false,
    time: 0,
    streak: 0,
    best: 0,
    fastest: 0,
  })
  solveDaily('takuzu', '2026-11-09', 80)
  solveDaily('takuzu', '2026-11-10', 95)
  //a second solve of the same day changes nothing
  solveDaily('takuzu', '2026-11-10', 10)
  expect(readDaily('takuzu', '2026-11-10')).toEqual({
    done: true,
    time: 95,
    streak: 2,
    best: 2,
    fastest: 80,
  })
  //the next day the streak still stands until the day passes unsolved
  expect(readDaily('takuzu', '2026-11-11').streak).toBe(2)
  expect(readDaily('takuzu', '2026-11-11').done).toBe(false)
  expect(readDaily('takuzu', '2026-11-12').streak).toBe(0)
  //a solve with hints counts the day without a time
  solveDaily('takuzu', '2026-11-13')
  expect(readDaily('takuzu', '2026-11-13')).toEqual({
    done: true,
    time: 0,
    streak: 1,
    best: 2,
    fastest: 80,
  })
  expect(readDaily('sudoku', '2026-11-13').best).toBe(0)
})

it('packs cells into a code and back, and turns away anything else', () => {
  const cells = [2, 0, 1, 1, 0, 0, 2, 1, 0]
  expect(unpack(pack(cells, 3), 9, 3)).toEqual(cells)
  //leading empties survive
  expect(unpack(pack([0, 0, 0, 1], 2), 4, 2)).toEqual([0, 0, 0, 1])
  expect(unpack('ZZ', 4, 2)).toBe(null)
  expect(unpack('zzzz', 4, 2)).toBe(null)
  const code = codeOf(3, 1, cells, 3)
  expect(partsOf(code, 3, () => true)).toEqual({ n: 3, level: 1, values: cells })
  expect(partsOf(code, 3, () => false)).toBe(null)
  expect(partsOf('3.1', 3, () => true)).toBe(null)
  expect(partsOf(`${code}.x`, 3, () => true)).toBe(null)
})

it('backs up only its own keys and restores them in place of what was there', () => {
  save('theme', 'nord')
  save('takuzu.8.1', '42')
  save('beginnerHintsName', 'Ann')
  save('someoneElse', 'keep me')
  expect(ours('sudoku.daily') && ours('savedGame.shelf') && ours('expert')).toBe(true)
  expect(ours('someoneElse') || ours('themes')).toBe(false)
  const text = exportData()
  expect(Object.keys(JSON.parse(text).data).sort()).toEqual([
    'beginnerHintsName',
    'takuzu.8.1',
    'theme',
  ])
  expect(readBackup('nonsense')).toBe(null)
  expect(readBackup(JSON.stringify({ app: 'other', version: 1, data: { theme: 'x' } }))).toBe(null)
  expect(importData('{}')).toBe(false)
  save('theme', 'matrix')
  save('2048.size', '5')
  expect(importData(text)).toBe(true)
  expect(load('theme')).toBe('nord')
  expect(load('2048.size')).toBe(null)
  expect(load('someoneElse')).toBe('keep me')
  //nothing is written after a restore until the page reloads
  save('theme', 'classic')
  expect(load('theme')).toBe('nord')
})
