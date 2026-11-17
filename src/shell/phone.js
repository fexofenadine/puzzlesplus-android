import { App } from '@capacitor/app'

//true in the android build (vite --mode android): no taskbar, boss key or window buttons,
//a top bar and drawer instead, and the game window fills the screen
export const phone = import.meta.env.MODE === 'android'

//the stylesheet keys the phone layout off the root, set before the first paint
if (phone) document.documentElement.dataset.phone = ''

//the board without its frame, set before the first paint too
try {
  if (phone && localStorage.getItem('windowCard') === 'yes')
    document.documentElement.dataset.card = ''
} catch {
  //blocked storage keeps the frame
}

//capacitor serves its root index.html for any path without a dot, so a folder link would land
//on the root page, which redirects to the first game and so loops; phones name the page
export const pageUrl = (url) => {
  if (!phone) return url
  const [path, hash] = url.split('#')
  const page = path.endsWith('/') ? `${path}index.html` : path
  return hash === undefined ? page : `${page}#${hash}`
}

//an open dialog closes the way esc closes it, its overlay listens for the key
export const closeDialog = () => {
  const overlays = document.querySelectorAll('[class*="Overlay_root"]')
  const top = overlays[overlays.length - 1]
  if (!top) return false
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  Object.defineProperty(event, 'keyCode', { get: () => 27 })
  top.dispatchEvent(event)
  return true
}

//past the drawer and dialogs, a guide goes back to its game and a game to the home screen
export const leave = (home) => (home ? location.assign(pageUrl(home)) : App.minimizeApp())

//the phone's own buzz when a hold has done its work, through MainActivity's PuzzlesTouch
export const longPress = () => {
  if (window.PuzzlesTouch) window.PuzzlesTouch.longPress()
}

//how long a hold takes: the phone's own long press time, which accessibility can lengthen,
//else the website's 600 ms
export const holdTime = () => {
  try {
    if (window.PuzzlesTouch) return window.PuzzlesTouch.longPressTimeout() || 600
  } catch {
    //an older app without it
  }
  return 600
}

//the system font size as --font-scale (14sp text) and --title-scale (22sp titles), which the
//phone's menus, bars and dialogs multiply their text by; the boards keep their own sizes
const fitFontScale = () => {
  const text = window.PuzzlesText
  if (!text) return
  const style = document.documentElement.style
  style.setProperty('--font-scale', text.scale(14).toFixed(3))
  style.setProperty('--title-scale', text.scale(22).toFixed(3))
  //css can't compare a variable, so grids that need fewer columns for big text read this
  if (text.scale(14) >= 1.15) document.documentElement.dataset.bigText = ''
  else delete document.documentElement.dataset.bigText
}

if (phone) {
  fitFontScale()
  //the dialogs fit themselves when they open, so only the variables need changing
  window.addEventListener('fontscale', fitFontScale)
}

export const fontScale = () =>
  parseFloat(document.documentElement.style.getPropertyValue('--font-scale')) || 1

//a website link opened in the app goes to the same page here, its #play= board and all
const SITE_PATH = /^https:\/\/fexofenadine\.github\.io\/puzzlesplus(\/[^#?]*)?(?:\?[^#]*)?(#.*)?$/
export const localOf = (url) => {
  const found = SITE_PATH.exec(url || '')
  if (!found) return null
  const path = (found[1] || '/').replace(/^\/+/, '')
  return pageUrl(`${location.origin}/${path}${found[2] || ''}`)
}

const openLink = (url) => {
  const target = localOf(url)
  if (!target) return
  const same = new URL(target).pathname === location.pathname
  location.assign(target)
  //a change of hash alone doesn't load the page, and the page reads its board as it loads
  if (same) location.reload()
}

//the link that started the app is still the launch url on every later page, even after other
//links have come in, so it is followed once per run
const openLaunchLink = async () => {
  try {
    const launch = await App.getLaunchUrl()
    const url = launch && launch.url
    if (!url || sessionStorage.getItem('launchLink') === url) return
    sessionStorage.setItem('launchLink', url)
    openLink(url)
  } catch {
    //no launch url, or blocked storage: stay put
  }
}

//any css colour as #rrggbb, which android's colour parser takes
const hex = (colour) => {
  const probe = document.createElement('i')
  probe.style.color = colour
  document.body.append(probe)
  const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g).map(Number)
  probe.remove()
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

//the system bars take the theme's bar colour (classic's title bar), through MainActivity's PuzzlesBars
const matchBars = () => {
  const style = getComputedStyle(document.documentElement)
  const colour = style.getPropertyValue('--md-bar') || style.getPropertyValue('--title-start')
  if (window.PuzzlesBars && colour.trim()) window.PuzzlesBars.set(hex(colour.trim()))
}

//android's back button runs the back action, links to the website open their page, and the
//system bars follow the theme
export const listenPhone = (actions) => {
  if (!phone) return
  App.addListener('backButton', () => actions.back())
  App.addListener('appUrlOpen', ({ url }) => openLink(url))
  openLaunchLink()
  matchBars()
  new MutationObserver(matchBars).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}
