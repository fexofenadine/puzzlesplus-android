import { load, remove, save } from '../shell/storage'
import { sizes } from './rules'

//best scores per size, kept apart for games that used a hint or undo, with the highest tile
//keys 2048.<n>[.help] for the score, .tile and .name beside it, and 2048.name for the last name
const keyOf = (n, assisted) => `2048.${n}${assisted ? '.help' : ''}`

const bestOf = (n, assisted) => {
  const key = keyOf(n, assisted)
  return {
    score: parseInt(load(key), 10) || 0,
    tile: parseInt(load(`${key}.tile`), 10) || 0,
    name: load(`${key}.name`) || 'Anonymous',
  }
}

const bestScores = (assisted) => Object.fromEntries(sizes.map((n) => [n, bestOf(n, assisted)]))

export const assistedOf = (game) => game.hinted || game.undone

//the name box for a game that beat its size's best score, or null
export const offer = (game) => {
  const assisted = assistedOf(game)
  if (!game.score || game.score <= bestOf(game.n, assisted).score) return null
  return {
    key: keyOf(game.n, assisted),
    score: game.score,
    tile: game.tile,
    assisted,
    name: load('2048.name') || '',
    text: `You have the best score for ${game.n} × ${game.n}${assisted ? ' with help' : ''}: ${game.score}.`,
  }
}

export const recordActions = {
  changeWinner:
    (payload) =>
    ({ winner }) => ({ winner: { ...winner, ...payload } }),
  submitBestTime:
    (event) =>
    ({ winner }, actions) => {
      event.preventDefault()
      const name = winner.name.trim()
      save(winner.key, winner.score)
      save(`${winner.key}.tile`, winner.tile)
      save(`${winner.key}.name`, name)
      save('2048.name', name)
      actions.toggleBestTime()
      actions.setBestTimeTab(winner.assisted ? 'hinted' : 'clean')
      return { winner: null }
    },
  toggleBestTime:
    () =>
    ({ bestTime }) => ({
      menu: null,
      bestTime: bestTime
        ? null
        : { tab: 'clean', clean: bestScores(false), hinted: bestScores(true) },
    }),
  setBestTimeTab: (tab) => (state) =>
    state.bestTime ? { bestTime: { ...state.bestTime, tab } } : null,
  resetBestTime:
    () =>
    ({ bestTime }) => {
      const assisted = bestTime.tab === 'hinted'
      for (const n of sizes) {
        const key = keyOf(n, assisted)
        remove(key)
        remove(`${key}.tile`)
        remove(`${key}.name`)
      }
      return { bestTime: { ...bestTime, [bestTime.tab]: bestScores(assisted) } }
    },
}
