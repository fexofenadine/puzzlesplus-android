import { beforeEach, expect, it } from 'vitest'
import { clearStats, readStats, tally } from './stats'

beforeEach(() => localStorage.clear())

it('starts at zero and survives a damaged save', () => {
  expect(readStats('g')).toEqual({ won: 0, lost: 0, clean: 0, streak: 0, best: 0 })
  localStorage.setItem('g.stats', '{nope')
  expect(readStats('g').won).toBe(0)
})

it('counts wins, losses and unaided streaks', () => {
  tally('g', { won: true })
  tally('g', { won: true })
  tally('g', { won: true, clean: false })
  expect(readStats('g')).toMatchObject({ won: 3, clean: 2, streak: 0, best: 2 })
  tally('g', { won: true })
  tally('g', { won: false })
  expect(readStats('g')).toMatchObject({ won: 4, lost: 1, streak: 0, best: 2 })
})

it('clears one game and leaves another', () => {
  tally('g', { won: true })
  tally('h', { won: true })
  expect(clearStats('g').won).toBe(0)
  expect(readStats('h').won).toBe(1)
})
