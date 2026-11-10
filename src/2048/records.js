import { load, remove, save } from '../shell/storage'
import { clearStats, lossesOn, readStats } from '../shell/stats'
import { sizes } from './rules'

//the best five games per size, kept apart for games that used a hint or undo
//keys 2048.<n>[.help].top (json), 2048.<n>[.help] with .tile and .name for the best of them
//(the keys before the list existed), and 2048.name for the last name
export const PLACES = 5

const keyOf = (n, assisted) => `2048.${n}${assisted ? '.help' : ''}`

const clean = (entry) => ({
  score: parseInt(entry && entry.score, 10) || 0,
  tile: parseInt(entry && entry.tile, 10) || 0,
  name: String((entry && entry.name) || 'Anonymous'),
})

//a score saved before the list existed is its first place
const topOf = (n, assisted) => {
  const key = keyOf(n, assisted)
  let list = []
  try {
    const saved = JSON.parse(load(`${key}.top`))
    if (Array.isArray(saved)) list = saved.map(clean)
  } catch {
    //a damaged list counts as none
  }
  const old = clean({
    score: load(key),
    tile: load(`${key}.tile`),
    name: load(`${key}.name`),
  })
  if (!list.length && old.score > 0) list = [old]
  return list
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, PLACES)
}

const bestScores = (assisted) => Object.fromEntries(sizes.map((n) => [n, topOf(n, assisted)]))

export const assistedOf = (game) => game.hinted || game.undone

//the name box for a game that makes its size's top five, or null
export const offer = (game) => {
  const assisted = assistedOf(game)
  const list = topOf(game.n, assisted)
  if (!game.score || (list.length >= PLACES && game.score <= list[PLACES - 1].score)) return null
  const first = !list.length || game.score > list[0].score
  const where = `${game.n} × ${game.n}${assisted ? ' with help' : ''}`
  return {
    key: keyOf(game.n, assisted),
    n: game.n,
    score: game.score,
    tile: game.tile,
    assisted,
    name: load('2048.name') || '',
    text: first
      ? `You have the best score for ${where}: ${game.score}.`
      : `You have a top ${PLACES} score for ${where}: ${game.score}.`,
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
      const list = [...topOf(winner.n, winner.assisted), clean({ ...winner, name })]
        .sort((a, b) => b.score - a.score)
        .slice(0, PLACES)
      save(`${winner.key}.top`, JSON.stringify(list))
      //the first place also goes under the old keys
      save(winner.key, list[0].score)
      save(`${winner.key}.tile`, list[0].tile)
      save(`${winner.key}.name`, list[0].name)
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
        : {
            tab: 'clean',
            clean: bestScores(false),
            hinted: bestScores(true),
            stats: readStats('2048'),
            losses: lossesOn(),
          },
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
        remove(`${key}.top`)
      }
      return { bestTime: { ...bestTime, [bestTime.tab]: bestScores(assisted) } }
    },
  resetStats:
    () =>
    ({ bestTime }) => ({ bestTime: { ...bestTime, stats: clearStats('2048') } }),
}
