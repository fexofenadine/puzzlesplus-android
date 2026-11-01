import { makeSheet } from './Boss'
import { load, save } from './storage'
import { themes } from './themes'
import { closeDialog, leave, listenBack, pageUrl, phone } from './phone'
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

const loadTheme = () => {
  const theme = load('theme')
  return themes.some(([id]) => id === theme) ? theme : 'classic'
}

//page is the game's folder name, root the way from this page back to the site's top
export const shellState = (page, root = '../') => ({
  page,
  root,
  menu: null,
  //open, minimised or closed
  windowState: 'open',
  //the game picked in the open games dialog, null while it is shut
  openGames: null,
  //the phone's side drawer
  drawer: false,
  //where back leaves to on a phone, a guide's game, otherwise the home screen
  home: null,
  theme: loadTheme(),
  boss: null,
  backgrounds: loadSettings(),
  backgroundSettings: null,
  howTo: false,
  //a phone always fills the screen
  zoom: { chosen: loadZoom(), scale: loadZoom(), seen: null, maximised: phone || loadMaximised() },
  portrait: Boolean(window.matchMedia && matchMedia('(orientation: portrait)').matches),
})

export const listen = (actions) => {
  //leaving the page pauses, coming back waits for play
  document.addEventListener('visibilitychange', () => document.hidden && actions.pause(true))
  window.addEventListener('blur', () => actions.pause(true))
  if (window.matchMedia) {
    matchMedia('(orientation: portrait)').addEventListener('change', (event) =>
      actions.setPortrait(event.matches),
    )
  }
  listenBack(actions)
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
  //the spreadsheet only answers to esc, and a hidden window to nothing
  if (state.boss || state.windowState !== 'open') return null
  const zoom = { '+': 1, '=': 1, '-': -1 }[event.key]
  if (zoom) {
    actions.zoom(zoom)
    return null
  }
  return event.keyCode
}

export const shellActions = {
  closeMenu: () => ({ menu: null }),
  toggleDrawer:
    () =>
    ({ drawer }) => ({ menu: null, drawer: !drawer }),
  closeDrawer: () => ({ menu: null, drawer: false }),
  //android's back button: the drawer, then a dialog, then leave
  back: () => (state) => {
    if (state.drawer) return { menu: null, drawer: false }
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
  //esc covers everything with a spreadsheet and pauses the game
  boss:
    () =>
    ({ boss }, actions) => {
      if (boss) return { boss: null }
      actions.pause(true)
      return { menu: null, boss: makeSheet() }
    },
  //a live draft, cancel restores the saved settings
  toggleBackgroundSettings:
    () =>
    ({ theme, backgrounds, backgroundSettings }) => {
      if (backgroundSettings) {
        configure(backgroundSettings.id, backgrounds[backgroundSettings.id])
        return { backgroundSettings: null }
      }
      const id = backgroundFor(theme)
      return { menu: null, backgroundSettings: id && { id, draft: { ...backgrounds[id] } } }
    },
  changeBackgroundSettings:
    (values) =>
    ({ backgroundSettings: { id, draft } }) => {
      const next = { ...draft, ...values }
      configure(id, next)
      return { backgroundSettings: { id, draft: next } }
    },
  resetBackgroundSettings: () => (state, actions) =>
    actions.changeBackgroundSettings(defaults(state.backgroundSettings.id)),
  submitBackgroundSettings:
    (event) =>
    ({ backgrounds, backgroundSettings: { id, draft } }) => {
      event.preventDefault()
      const next = { ...backgrounds, [id]: draft }
      saveSettings(next)
      return { backgrounds: next, backgroundSettings: null }
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
  setTheme: (theme) => () => {
    save('theme', theme)
    document.documentElement.dataset.theme = theme
    return {
      menu: null,
      theme,
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
