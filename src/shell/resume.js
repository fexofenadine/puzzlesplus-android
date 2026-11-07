import { load, remove, save } from './storage'
import { clock } from './clock'

//the game in progress kept under key, so a reload or a closed app comes back to it, paused
//pack(game) gives the plain parts worth keeping, unpack(parts) rebuilds a game or throws
//running(game) says whether there is anything to keep, a won, lost or fresh game drops it
export const resumable = ({ key, running, pack, unpack }) => {
  let last = null

  //writes only when the parts or the pause changed, or when forced as the page goes
  const keep = (game, force = false) => {
    if (!running(game)) {
      if (last !== '') remove(key)
      last = ''
      return
    }
    const parts = JSON.stringify(pack(game))
    const seen = `${game.paused}${parts}`
    if (seen === last && !force) return
    last = seen
    const elapsed = Math.max(0, (game.paused ? game.pausedAt : clock()) - game.start)
    save(key, `{"version":1,"elapsed":${Math.floor(elapsed)},"game":${parts}}`)
  }

  //the saved game paused at its saved time, or null when there is none or it doesn't fit
  const restore = () => {
    try {
      const saved = JSON.parse(load(key))
      if (!saved || saved.version !== 1 || !(saved.elapsed >= 0)) return null
      const now = clock()
      return {
        ...unpack(saved.game),
        start: now - saved.elapsed,
        time: Math.floor(saved.elapsed / 1000) + 1,
        raf: null,
        paused: true,
        pausedAt: now,
      }
    } catch {
      return null
    }
  }

  const actions = {
    //the page is going or hidden, so the clock's latest time is kept too
    keepGame:
      () =>
      ({ game }) => {
        keep(game, true)
      },
  }

  return { keep, restore, actions }
}

//a check for unpack, so a save from another version is dropped instead of half used
export const check = (ok) => {
  if (!ok) throw new Error('saved game does not fit')
}
