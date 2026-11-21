import { beforeEach, expect, it } from 'vitest'
import { average, clearStats, clockText, readStats, tally, timeOf } from './stats'

beforeEach(() => localStorage.clear())

it('starts at zero and survives a damaged save', () => {
  expect(readStats('g')).toEqual({
    won: 0,
    lost: 0,
    clean: 0,
    streak: 0,
    best: 0,
    timed: 0,
    total: 0,
    levels: {},
  })
  localStorage.setItem('g.stats', '{nope')
  expect(readStats('g').won).toBe(0)
})

it('counts wins, losses and unaided streaks', () => {
  localStorage.setItem('losses', 'on')
  tally('g', { won: true })
  tally('g', { won: true })
  tally('g', { won: true, clean: false })
  expect(readStats('g')).toMatchObject({ won: 3, clean: 2, streak: 0, best: 2 })
  tally('g', { won: true })
  tally('g', { won: false })
  expect(readStats('g')).toMatchObject({ won: 4, lost: 1, streak: 0, best: 2 })
})

it('skips losses, and leaves the streak alone, until they are switched on', () => {
  tally('g', { won: true })
  tally('g', { won: false })
  expect(readStats('g')).toMatchObject({ won: 1, lost: 0, streak: 1 })
})

it('clears one game and leaves another', () => {
  tally('g', { won: true })
  tally('h', { won: true })
  expect(clearStats('g').won).toBe(0)
  expect(readStats('h').won).toBe(1)
})

it('averages timed wins without help, overall and by board', () => {
  tally('g', { won: true, time: 100, level: '9 × 9 Easy' })
  tally('g', { won: true, time: 200, level: '9 × 9 Easy' })
  tally('g', { won: true, time: 90, level: '9 × 9 Hard' })
  //a helped win and an untimed one count as wins but not towards the averages
  tally('g', { won: true, clean: false, time: 0, level: '9 × 9 Easy' })
  tally('g', { won: true, level: '9 × 9 Easy' })
  const stats = readStats('g')
  expect(stats).toMatchObject({ won: 5, timed: 3, total: 390 })
  expect(stats.levels).toEqual({ '9 × 9 Easy': [2, 300], '9 × 9 Hard': [1, 90] })
  expect(average(stats.total, stats.timed)).toBe(130)
})

it('drops damaged board entries', () => {
  localStorage.setItem(
    'g.stats',
    JSON.stringify({ won: 1, levels: { a: [1, 5], b: 'x', c: [-1, 2] } }),
  )
  expect(readStats('g').levels).toEqual({ a: [1, 5] })
})

it('counts a time only for a timed, unhelped game of the player', () => {
  const game = { time: 42 }
  expect(timeOf(true, game)).toBe(42)
  expect(timeOf(false, game)).toBe(0)
  expect(timeOf(true, { ...game, untimed: true })).toBe(0)
  expect(timeOf(true, { ...game, hinted: true })).toBe(0)
  expect(timeOf(true, { ...game, shared: true })).toBe(0)
})

it('writes times as minutes and seconds', () => {
  expect(clockText(5)).toBe('0:05')
  expect(clockText(754)).toBe('12:34')
  expect(clockText(3725)).toBe('1:02:05')
})
