import { freeze, keys, load, remove, save } from './storage'

//everything the games keep in this browser as one text, to carry to another browser or the app
//github.io shares its storage with other sites, so only keys that are ours go in or get replaced

const plain = [
  'theme',
  'scale',
  'maximised',
  'backgrounds',
  'windowOpacity',
  'windowHidden',
  'fireworks',
  'lastGame',
  'losses',
  'level',
  'safeStart',
  'noGuess',
  'marks',
  'timer',
  'savedGame',
  'savedGame.shelf',
]

export const ours = (key) =>
  plain.includes(key) ||
  /^(minesweeper|takuzu|nonograms|sudoku|2048)\./.test(key) ||
  /^(beginner|intermediate|expert|extreme)(Hints)?(Name)?$/.test(key)

export const exportData = (now = new Date()) =>
  JSON.stringify({
    app: 'puzzlesplus',
    version: 1,
    saved: now.toISOString(),
    data: Object.fromEntries(
      keys()
        .filter(ours)
        .map((key) => [key, load(key)]),
    ),
  })

//the settings in a backup's text, null when it is not one
export const readBackup = (text) => {
  try {
    const { app, version, data } = JSON.parse(text)
    if (app !== 'puzzlesplus' || version !== 1 || !data || typeof data !== 'object') return null
    const entries = Object.entries(data).filter(
      ([key, value]) => ours(key) && typeof value === 'string',
    )
    return entries.length ? entries : null
  } catch {
    return null
  }
}

//replaces what is kept here with a backup; nothing more is saved until the page reloads,
//or the game on screen would be written back over it as the page goes
export const importData = (text) => {
  const entries = readBackup(text)
  if (!entries) return false
  keys().filter(ours).forEach(remove)
  entries.forEach(([key, value]) => save(key, value))
  freeze()
  return true
}
