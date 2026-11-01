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

//android's back button runs the back action
export const listenBack = (actions) => {
  if (phone) App.addListener('backButton', () => actions.back())
}
