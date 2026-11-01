import { App } from '@capacitor/app'

//true in the android build (vite --mode android): no taskbar, boss key or window buttons,
//a top bar and drawer instead, and the game window fills the screen
export const phone = import.meta.env.MODE === 'android'

//the stylesheet keys the phone layout off the root, set before the first paint
if (phone) document.documentElement.dataset.phone = ''

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

//any css colour as #rrggbb, which android's colour parser takes
const hex = (colour) => {
  const probe = document.createElement('i')
  probe.style.color = colour
  document.body.append(probe)
  const [r, g, b] = getComputedStyle(probe).color.match(/\d+/g).map(Number)
  probe.remove()
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

//the system bars take the theme's title bar colour, through MainActivity's PuzzlesBars
const matchBars = () => {
  const colour = getComputedStyle(document.documentElement).getPropertyValue('--title-start')
  if (window.PuzzlesBars && colour.trim()) window.PuzzlesBars.set(hex(colour.trim()))
}

//android's back button runs the back action, and the system bars follow the theme
export const listenPhone = (actions) => {
  if (!phone) return
  App.addListener('backButton', () => actions.back())
  matchBars()
  new MutationObserver(matchBars).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
}
