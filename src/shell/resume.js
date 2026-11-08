import { load, remove, save } from './storage'
import { clock } from './clock'

//the games parked for later, newest first, per game
const SHELF = 3

//the game in progress kept under key, so a reload or a closed app comes back to it, paused
//pack(game) gives the plain parts worth keeping, unpack(parts) rebuilds a game or throws
//running(game) says whether there is anything to keep, a won, lost or fresh game drops it
//label(game) names a game for the resume list, fresh is the state a resumed game starts from
export const resumable = ({ key, running, pack, unpack, label = () => '', fresh = {} }) => {
  let last = null
  const shelfKey = `${key}.shelf`

  const elapsedOf = (game) =>
    Math.max(0, Math.floor((game.paused ? game.pausedAt : clock()) - game.start))

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
    save(key, `{"version":1,"elapsed":${elapsedOf(game)},"game":${parts}}`)
  }

  //a game rebuilt from a save, paused at its saved time; throws when it doesn't fit
  const revive = (saved) => {
    if (!saved || saved.version !== 1 || !(saved.elapsed >= 0)) throw new Error('no saved game')
    const now = clock()
    return {
      ...unpack(saved.game),
      start: now - saved.elapsed,
      time: Math.floor(saved.elapsed / 1000) + 1,
      raf: null,
      paused: true,
      pausedAt: now,
    }
  }

  //the saved game paused at its saved time, or null when there is none or it doesn't fit
  const restore = () => {
    try {
      return revive(JSON.parse(load(key)))
    } catch {
      return null
    }
  }

  const read = () => {
    try {
      const entries = JSON.parse(load(shelfKey))
      return Array.isArray(entries) ? entries.filter((e) => e && e.game && e.elapsed >= 0) : []
    } catch {
      return []
    }
  }

  //what the resume list shows
  const list = () => read().map(({ id, label, elapsed }) => ({ id, label, elapsed }))

  //puts a game in progress on the shelf, the oldest going when it is full
  const park = (game) => {
    const entry = {
      version: 1,
      id: Date.now(),
      label: label(game),
      elapsed: elapsedOf(game),
      game: pack(game),
    }
    save(shelfKey, JSON.stringify([entry, ...read()].slice(0, SHELF)))
  }

  const actions = {
    //the page is going or hidden, so the clock's latest time is kept too
    keepGame:
      () =>
      ({ game }) => {
        keep(game, true)
      },
    //a menu or key asks for another game: with one in play, ask what to do with it first
    newGame:
      (payload) =>
      ({ game }, actions) => {
        if (!running(game)) {
          actions.reset(payload)
          return null
        }
        return { menu: null, switching: { payload } }
      },
    //the window's close button asks the same
    closeGame:
      () =>
      ({ game }, actions) => {
        if (!running(game)) {
          actions.finishClose()
          return null
        }
        return { menu: null, switching: { close: true } }
      },
    //save parks the game for later, discard drops it, anything else keeps playing
    answerSwitch:
      (choice) =>
      ({ switching, game }, actions) => {
        if (!switching) return null
        if (choice === 'save' || choice === 'discard') {
          if (choice === 'save') {
            park(game)
            //the game is not over, only put aside
            switching.parked = true
          }
          if (switching.close) actions.finishClose()
          else actions.reset(switching.payload)
        }
        return { switching: null, shelf: list() }
      },
    //takes a parked game back, parking the one in play
    resumeGame:
      (id) =>
      ({ game }) => {
        const entries = read()
        const entry = entries.find((e) => e.id === id)
        let back
        try {
          back = revive(entry)
        } catch {
          //one that no longer fits is dropped
          save(shelfKey, JSON.stringify(entries.filter((e) => e.id !== id)))
          return { menu: null, shelf: list() }
        }
        save(shelfKey, JSON.stringify(entries.filter((e) => e.id !== id)))
        cancelAnimationFrame(game.raf)
        if (running(game)) park(game)
        return { menu: null, hint: null, prompt: false, ...fresh, game: back, shelf: list() }
      },
  }

  return { keep, restore, list, actions }
}

//a check for unpack, so a save from another version is dropped instead of half used
export const check = (ok) => {
  if (!ok) throw new Error('saved game does not fit')
}
