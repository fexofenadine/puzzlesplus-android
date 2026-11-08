import { describe, expect, it, vi } from 'vitest'
import { resumable } from './resume'
import { clock } from './clock'

const made = () =>
  resumable({
    key: 'test.saved',
    running: (game) => game.start >= 0 && !game.win,
    label: (game) => `size ${game.n}`,
    pack: ({ n, board }) => ({ n, board }),
    unpack: ({ n, board }) => ({ n, board, win: false }),
  })

const playing = (n) => ({ n, board: [n], start: clock() - 5000, win: false, paused: false })

//runs an action the way hyperapp does, collecting what it asks of other actions
const run = (saved, name, payload, game, extra = {}) => {
  const calls = []
  const actions = {
    reset: (p) => calls.push(['reset', p]),
    finishClose: () => calls.push(['close']),
  }
  const state = { game, switching: null, ...extra }
  const result = saved.actions[name](payload)(state, actions)
  return { result, calls }
}

describe('games in play', () => {
  it('starts a new game at once when none is in play', () => {
    const saved = made()
    const { result, calls } = run(saved, 'newGame', { n: 5 }, { ...playing(4), start: -1 })
    expect(result).toBe(null)
    expect(calls).toEqual([['reset', { n: 5 }]])
  })

  it('asks first, then parks the game or drops it', () => {
    const saved = made()
    const asked = run(saved, 'newGame', { n: 5 }, playing(4))
    expect(asked.result.switching).toEqual({ payload: { n: 5 } })
    expect(asked.calls).toEqual([])
    const kept = run(saved, 'answerSwitch', 'save', playing(4), {
      switching: asked.result.switching,
    })
    expect(kept.calls).toEqual([['reset', { n: 5 }]])
    expect(kept.result.shelf.map((e) => e.label)).toEqual(['size 4'])
    const dropped = run(saved, 'answerSwitch', 'discard', playing(6), {
      switching: asked.result.switching,
    })
    expect(dropped.result.shelf.length).toBe(1)
    const cancelled = run(saved, 'answerSwitch', null, playing(6), {
      switching: asked.result.switching,
    })
    expect(cancelled.calls).toEqual([])
  })

  it('keeps the latest three and resumes one, parking the game in play', () => {
    vi.useFakeTimers()
    const saved = made()
    const switching = { payload: {} }
    for (const n of [3, 4, 5, 6]) {
      vi.advanceTimersByTime(10)
      run(saved, 'answerSwitch', 'save', playing(n), { switching })
    }
    expect(saved.list().map((e) => e.label)).toEqual(['size 6', 'size 5', 'size 4'])
    const id = saved.list()[2].id
    const { result } = run(saved, 'resumeGame', id, playing(9))
    expect(result.game.n).toBe(4)
    expect(result.game.paused).toBe(true)
    expect(result.shelf.map((e) => e.label)).toEqual(['size 9', 'size 6', 'size 5'])
    vi.useRealTimers()
  })
})
