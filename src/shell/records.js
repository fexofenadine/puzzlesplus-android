import { load, remove, save } from './storage'
import { clearStats, readStats } from './stats'

//best times by size and level under prefix, apart for games with and without hints
//withArt adds the art board, which counts only games played without hints
export const records = (prefix, sizes, levelNames, withArt = false) => {
  const timeKey = (n, level, hinted, art = false) =>
    `${prefix}${art ? '.art' : ''}.${n}.${level}${hinted ? '.hints' : ''}`

  const eachSlot = (fn) =>
    sizes.flatMap((n) => levelNames.map((_, level) => fn(n, level, `${n}.${level}`)))

  //a board is clean, hinted or art
  const keyOf = (board, n, level) => timeKey(n, level, board === 'hinted', board === 'art')

  const bestTimes = (board) =>
    Object.fromEntries(
      eachSlot((n, level, slot) => {
        const key = keyOf(board, n, level)
        const saved = parseInt(load(key), 10)
        return [
          slot,
          { set: Boolean(saved), time: saved || 999, name: load(`${key}.name`) || 'Anonymous' },
        ]
      }),
    )

  const clearBestTimes = (board) => {
    eachSlot((n, level) => {
      const key = keyOf(board, n, level)
      remove(key)
      remove(`${key}.name`)
    })
    return bestTimes(board)
  }

  const actions = {
    win:
      ({ n, level, hinted, time, art = false }) =>
      () => {
        const board = art ? 'art' : hinted ? 'hinted' : 'clean'
        const key = keyOf(board, n, level)
        const best = parseInt(load(key), 10)
        if (best && best <= time) return null
        return {
          winner: {
            key,
            time,
            hinted,
            board,
            level: `${levelNames[level].toLowerCase()} ${n} × ${n}`,
            text:
              art &&
              `You have the fastest art time for ${levelNames[level].toLowerCase()} ${n} × ${n}.`,
            name: load(`${prefix}.name`) || '',
          },
        }
      },
    changeWinner:
      (payload) =>
      ({ winner }) => ({
        winner: { ...winner, ...payload },
      }),
    submitBestTime:
      (event) =>
      ({ winner }, actions) => {
        event.preventDefault()
        const name = winner.name.trim()
        save(winner.key, winner.time)
        save(`${winner.key}.name`, name)
        save(`${prefix}.name`, name)
        actions.toggleBestTime()
        actions.setBestTimeTab(winner.board)
        return { winner: null }
      },
    toggleBestTime:
      () =>
      ({ bestTime }) => ({
        menu: null,
        bestTime: bestTime
          ? null
          : {
              tab: 'clean',
              clean: bestTimes('clean'),
              hinted: bestTimes('hinted'),
              ...(withArt && { art: bestTimes('art') }),
              stats: readStats(prefix),
            },
      }),
    setBestTimeTab: (tab) => (state) =>
      state.bestTime ? { bestTime: { ...state.bestTime, tab } } : null,
    resetBestTime:
      () =>
      ({ bestTime }) => ({
        bestTime: { ...bestTime, [bestTime.tab]: clearBestTimes(bestTime.tab) },
      }),
    resetStats:
      () =>
      ({ bestTime }) => ({ bestTime: { ...bestTime, stats: clearStats(prefix) } }),
  }

  return { timeKey, eachSlot, actions }
}
