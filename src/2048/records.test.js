import { beforeEach, expect, it } from 'vitest'
import { offer, PLACES, recordActions } from './records'

beforeEach(() => localStorage.clear())

const add = (score, name = 'A') => {
  const winner = offer({ n: 4, score, tile: 64 })
  if (!winner) return null
  let state = { winner: { ...winner, name } }
  const actions = {
    toggleBestTime() {},
    setBestTimeTab() {},
  }
  state = recordActions.submitBestTime({ preventDefault() {} })(state, actions)
  return state
}

it('keeps the best five and turns away a lower score once full', () => {
  for (const score of [100, 500, 300, 200, 400]) add(score)
  expect(add(50)).toBeNull()
  expect(add(250)).not.toBeNull()
  const saved = JSON.parse(localStorage.getItem('2048.4.top'))
  expect(saved.map((entry) => entry.score)).toEqual([500, 400, 300, 250, 200])
  expect(saved).toHaveLength(PLACES)
  expect(localStorage.getItem('2048.4')).toBe('500')
})

it('treats a score saved before the list as first place', () => {
  localStorage.setItem('2048.4', '800')
  localStorage.setItem('2048.4.name', 'Old')
  expect(offer({ n: 4, score: 900, tile: 128 }).text).toContain('best score')
  expect(offer({ n: 4, score: 100, tile: 8 }).text).toContain('top 5')
})
