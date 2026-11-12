import { dialogOpen } from '../Overlay'
import { makeSheet } from './Boss'
import { importData } from './backup'
import { copy, linkOf } from './share'
import { load, save } from './storage'
import { fireworksKey, fireworksOn } from './fireworks'
import { themes } from './themes'
import { closeDialog, leave, listenPhone, pageUrl, phone } from './phone'
import { games } from './GameLinks'
import { backgroundFor, configure, defaults, loadSettings, saveSettings } from './backgrounds'
import {
  applyZoom,
  fitZoom,
  loadMaximised,
  loadZoom,
  maxZoom,
  measureFit,
  sameSize,
  saveMaximised,
  saveZoom,
  stepZoom,
} from './zoom'

//state and actions every game window shares, spread into each game's own
//games provide pause(paused), press(event) and reset(), the shell calls them

//the game window's frame: opacity in percent, hidden fades it out entirely
const loadGlass = () => {
  const saved = load('windowOpacity')
  const opacity = Number(saved)
  return {
    opacity: saved && opacity >= 0 && opacity <= 100 ? opacity : 100,
    hidden: Boolean(load('windowHidden')),
  }
}

//how solid a game window's frame is now, null while fully solid
export const windowClear = ({ glass, backgroundSettings }) => {
  const opacity = glass.hidden
    ? 0
    : backgroundSettings && backgroundSettings.opacity !== undefined
      ? backgroundSettings.opacity
      : glass.opacity
  return opacity < 100 ? opacity : null
}

export const isGame = (page) => games.some(([id]) => id === page)

const loadTheme = () => {
  const theme = load('theme')
  return themes.some(([id]) => id === theme) ? theme : 'classic'
}

//the site's top page opens the game played last
const remember = (page) => {
  if (isGame(page)) save('lastGame', page)
  return page
}

//page is the game's folder name, root the way from this page back to the site's top
export const shellState = (page, root = '../') => ({
  page: remember(page),
  root,
  menu: null,
  //open, minimised or closed
  windowState: 'open',
  //the game picked in the open games dialog, null while it is shut
  openGames: null,
  //the phone's side panel of places, and its sheet of options from the bottom
  drawer: false,
  sheet: false,
  //a phone can show the board without its windows 95 frame, on a card
  card: load('windowCard') === 'yes',
  //where back leaves to on a phone, a guide's game, otherwise the home screen
  home: null,
  //set while a game in play waits to hear what becomes of it
  switching: null,
  theme: loadTheme(),
  boss: null,
  backgrounds: loadSettings(),
  backgroundSettings: null,
  glass: loadGlass(),
  fireworks: fireworksOn(page, loadTheme()),
  howTo: false,
  about: false,
  //the copy link and backup dialogs, null while shut
  share: null,
  backup: null,
  //a phone always fills the screen
  zoom: { chosen: loadZoom(), scale: loadZoom(), seen: null, maximised: phone || loadMaximised() },
  portrait: Boolean(window.matchMedia && matchMedia('(orientation: portrait)').matches),
})

export const listen = (actions) => {
  //leaving the page pauses, coming back waits for play
  //the game is kept as the page hides or goes, so a reload or a closed app picks it up
  const away = () => {
    actions.pause(true)
    if (actions.keepGame) actions.keepGame()
  }
  document.addEventListener('visibilitychange', () => document.hidden && away())
  window.addEventListener('pagehide', away)
  window.addEventListener('blur', () => actions.pause(true))
  if (window.matchMedia) {
    matchMedia('(orientation: portrait)').addEventListener('change', (event) =>
      actions.setPortrait(event.matches),
    )
  }
  listenPhone(actions)
}

//keys typed into a dialog's fields are not shortcuts
export const typing = (event) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)

//the key code a game should act on, or null once the shell has handled it
export const shortcut = (event, state, actions) => {
  //leave typing in a dialog and browser shortcuts alone
  if (typing(event) || event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.keyCode === 27) {
    //an open menu closes first, as in windows
    if (state.menu) actions.closeMenu()
    else if (!phone) actions.boss()
    return null
  }
  //the spreadsheet only answers to esc, a hidden window to nothing, a dialog to its own keys
  if (state.boss || state.windowState !== 'open' || dialogOpen()) return null
  const zoom = { '+': 1, '=': 1, '-': -1 }[event.key]
  if (zoom) {
    actions.zoom(zoom)
    return null
  }
  return event.keyCode
}

//the keys every game shares once the shell has had its turn, true when it was one of them
export const gameKey = (key, actions) => {
  if (key === 113 || key === 78) actions.newGame()
  else if (key === 72) actions.hint()
  else if (key === 80) actions.pause()
  else return false
  return true
}

//ctrl or cmd with a key, for the only shortcuts with a modifier
//not while typing, behind the spreadsheet or a dialog, or with the window hidden
const modified = (event, state) =>
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  !typing(event) &&
  !state.boss &&
  state.windowState === 'open' &&
  !dialogOpen()

//ctrl z
export const undoKey = (event, state) =>
  modified(event, state) && event.keyCode === 90 && !event.shiftKey

//ctrl y, or ctrl shift z
export const redoKey = (event, state) =>
  modified(event, state) && (event.keyCode === 89 || (event.keyCode === 90 && event.shiftKey))

//undo and redo for a game that has both, true when the key was one of them
export const historyKey = (event, state, actions) => {
  const step = undoKey(event, state) ? actions.undo : redoKey(event, state) ? actions.redo : null
  if (!step) return false
  event.preventDefault()
  step()
  return true
}

//for the page's context menu and drags, which a game never wants
export const prevent = (event) => {
  event.preventDefault()
  return false
}

//a menu option kept in storage: on is saved while state[name] holds, off while it doesn't
export const toggleAction =
  (name, key, on, off = '') =>
  () =>
  (state) => {
    save(key, state[name] ? off : on)
    return { menu: null, [name]: !state[name] }
  }

//the board in play as a link, code(game) packs it; the dialog shows the link either way
export const shareAction = (code) => () => (state, actions) => {
  if (state.game.dealing) return { menu: null }
  const link = linkOf(state.page, code(state.game))
  copy(link).then(actions.shareCopied)
  return { menu: null, share: { link, copied: false } }
}

export const shellActions = {
  closeShare: () => ({ share: null }),
  shareCopied:
    (copied) =>
    ({ share }) =>
      share && { share: { ...share, copied } },
  copyShare:
    () =>
    ({ share }, actions) => {
      copy(share.link).then(actions.shareCopied)
    },
  //the game in play is kept first, so the backup has it
  toggleBackup:
    () =>
    ({ backup }, actions) => {
      if (!backup && actions.keepGame) actions.keepGame()
      return { menu: null, backup: backup ? null : { text: '', note: '', pending: null } }
    },
  changeBackup:
    (values) =>
    ({ backup }) =>
      backup && { backup: { ...backup, ...values } },
  //the page starts again from what the backup held
  restoreBackup:
    () =>
    ({ backup }) => {
      if (importData(backup.pending)) location.reload()
      else
        return { backup: { ...backup, pending: null, note: 'That is not a Puzzles Plus backup.' } }
    },
  closeMenu: () => ({ menu: null }),
  toggleDrawer:
    () =>
    ({ drawer }) => ({ menu: null, drawer: !drawer, sheet: false }),
  toggleSheet:
    () =>
    ({ sheet }) => ({ menu: null, sheet: !sheet, drawer: false }),
  closeDrawer: () => ({ menu: null, drawer: false, sheet: false }),
  toggleCard:
    () =>
    ({ card }) => {
      save('windowCard', card ? '' : 'yes')
      if (card) delete document.documentElement.dataset.card
      else document.documentElement.dataset.card = ''
      return { card: !card }
    },
  //android's back button: the side panel or sheet, then a dialog, then leave
  back: () => (state) => {
    if (state.drawer || state.sheet) return { menu: null, drawer: false, sheet: false }
    if (!closeDialog()) leave(state.home)
    return null
  },
  toggleStart:
    () =>
    ({ menu }) => ({ menu: menu && menu.start ? null : { start: true } }),
  //minimised keeps the game paused until its taskbar button brings it back
  minimise: () => (state, actions) => {
    actions.pause(true)
    return { menu: null, windowState: 'minimised' }
  },
  //closing ends the game and offers every game instead
  close: () => (state, actions) => {
    actions.closeGame()
  },
  finishClose: () => (state, actions) => {
    actions.reset()
    return { menu: null, windowState: 'closed', openGames: state.page }
  },
  selectGame: (openGames) => ({ openGames }),
  //another game is another page, this one comes back with a fresh game
  openGame: (id) => (state) => {
    if (id !== state.page) {
      location.assign(pageUrl(`${state.root}${id}/`))
      return { menu: null }
    }
    return { menu: null, openGames: null, windowState: 'open' }
  },
  //a taskbar button minimises its window like in windows, or brings it back
  taskbarGame: (id) => (state, actions) => {
    if (id === state.page && state.windowState === 'open') return actions.minimise()
    return actions.openGame(id)
  },
  setPortrait: (portrait) => ({ portrait }),
  toggleHowTo:
    () =>
    ({ howTo }) => ({ menu: null, howTo: !howTo }),
  toggleAbout:
    () =>
    ({ about }) => ({ menu: null, about: !about }),
  //esc covers everything with a spreadsheet and pauses the game
  boss:
    () =>
    ({ boss }, actions) => {
      if (boss) return { boss: null }
      actions.pause(true)
      return { menu: null, boss: makeSheet() }
    },
  //a live draft, cancel restores the saved settings
  //a theme without a background still has the window's opacity, game pages only
  toggleBackgroundSettings:
    () =>
    ({ page, theme, backgrounds, backgroundSettings, glass }) => {
      if (backgroundSettings) {
        if (backgroundSettings.id)
          configure(backgroundSettings.id, backgrounds[backgroundSettings.id])
        return { backgroundSettings: null }
      }
      const id = backgroundFor(theme)
      const opacity = isGame(page) ? glass.opacity : undefined
      if (!id && opacity === undefined) return { menu: null }
      return {
        menu: null,
        backgroundSettings: { id, draft: id ? { ...backgrounds[id] } : {}, opacity },
      }
    },
  changeBackgroundSettings:
    (values) =>
    ({ backgroundSettings }) => {
      const draft = { ...backgroundSettings.draft, ...values }
      if (backgroundSettings.id) configure(backgroundSettings.id, draft)
      return { backgroundSettings: { ...backgroundSettings, draft } }
    },
  changeOpacity:
    (opacity) =>
    ({ backgroundSettings }) => ({ backgroundSettings: { ...backgroundSettings, opacity } }),
  resetBackgroundSettings: () => (state, actions) => {
    const { id, opacity } = state.backgroundSettings
    if (opacity !== undefined) actions.changeOpacity(100)
    if (id) actions.changeBackgroundSettings(defaults(id))
  },
  submitBackgroundSettings:
    (event) =>
    ({ backgrounds, backgroundSettings: { id, draft, opacity }, glass }) => {
      event.preventDefault()
      const next = id ? { ...backgrounds, [id]: draft } : backgrounds
      if (id) saveSettings(next)
      if (opacity !== undefined) save('windowOpacity', opacity === 100 ? '' : opacity)
      return {
        backgrounds: next,
        backgroundSettings: null,
        glass: opacity === undefined ? glass : { ...glass, opacity },
      }
    },
  toggleHideWindow:
    () =>
    ({ glass }) => {
      save('windowHidden', glass.hidden ? '' : 'yes')
      return { menu: null, glass: { ...glass, hidden: !glass.hidden } }
    },
  toggleFireworks:
    () =>
    ({ fireworks, page, theme }) => {
      const key = fireworksKey(page, theme)
      save(key, key === 'fireworks' ? (fireworks ? 'off' : '') : fireworks ? '' : 'on')
      return { menu: null, fireworks: !fireworks }
    },
  //a phone's options sheet sets the opacity straight away, saved as it goes
  setOpacity:
    (opacity) =>
    ({ glass }) => {
      save('windowOpacity', opacity === 100 ? '' : opacity)
      return { glass: { ...glass, opacity } }
    },
  //shrink the chosen zoom to fit, only for a new level, theme or browser size
  fit:
    () =>
    ({ zoom }) => {
      const { fit, size } = measureFit()
      //a hidden window has no size, it fits again when shown
      if (!size || sameSize(size, zoom.seen)) return null
      const scale = zoom.maximised ? maxZoom(fit) : fitZoom(zoom.chosen, fit)
      applyZoom(scale)
      return { zoom: { ...zoom, scale, seen: size } }
    },
  //the largest size the room allows, or back to the chosen zoom
  maximise:
    () =>
    ({ zoom }) => {
      const maximised = !zoom.maximised
      const { fit, size } = measureFit()
      const scale = maximised ? maxZoom(fit) : fitZoom(zoom.chosen, fit)
      if (!Number.isFinite(scale)) return { menu: null }
      saveMaximised(maximised)
      applyZoom(scale)
      return { menu: null, zoom: { ...zoom, maximised, scale, seen: size } }
    },
  //step from the shown size, or back to 100%, either way no longer maximised
  zoom:
    (direction) =>
    ({ zoom }) => {
      const { fit, size } = measureFit()
      const chosen = direction ? stepZoom(zoom.scale, direction) : 1
      const scale = direction ? chosen : fitZoom(chosen, fit)
      saveZoom(chosen)
      saveMaximised(false)
      applyZoom(scale)
      return { menu: null, zoom: { chosen, scale, seen: size, maximised: false } }
    },
  setTheme:
    (theme) =>
    ({ page }) => {
      save('theme', theme)
      document.documentElement.dataset.theme = theme
      return {
        menu: null,
        theme,
        fireworks: fireworksOn(page, theme),
      }
    },
  toggleMenu:
    (event) =>
    ({ menu }) => {
      const { name } = event.currentTarget.dataset
      if (event.type === 'click') {
        return { menu: menu && menu[name] ? null : { [name]: true } }
      }
      //a tap also sends mouseenter, which would open the section the click then shuts
      if (event.type === 'mouseenter' && !phone) {
        return menu ? { menu: { [name]: true } } : null
      }
      if (event.type === 'focusout' && !event.currentTarget.contains(event.relatedTarget)) {
        return { menu: null }
      }
      return null
    },
}
