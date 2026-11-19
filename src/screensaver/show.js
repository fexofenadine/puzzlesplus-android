import './seed'
import '../app.css'
import './screensaver.css'
import { setFrameCap, startBackgrounds } from '../shell/backgrounds'
import { loadOptions, randomTheme } from './options'

//the screensaver itself: fullscreen in the windows screensaver (/s), in the screen saver settings'
//little monitor (?preview), or the android app's live wallpaper (?wallpaper), which the app's
//wallpaper service draws on the home screen and moves with drift(x) as the home screens slide
const root = document.documentElement
const query = new URLSearchParams(location.search)
const preview = query.has('preview')
const wallpaper = query.has('wallpaper')
if (preview) root.dataset.preview = ''
if (wallpaper) root.dataset.wallpaper = ''
//a slow shader keeps drawing at its lowest size rather than giving up for a still picture
root.dataset.always = ''

const { random, minutes, fps, drift } = loadOptions()
if (random) {
  root.dataset.theme = randomTheme(root.dataset.theme)
  setInterval(() => (root.dataset.theme = randomTheme(root.dataset.theme)), minutes * 60000)
}
if (wallpaper) setFrameCap(fps)

startBackgrounds()

//x from 0 (the leftmost home screen) to 1 (the rightmost)
window.drift = (x) => {
  if (!drift) return
  root.style.setProperty('--drift', `${(0.5 - x) * 2}`)
}

//the settings changed underneath: the wallpaper starts again with them
if (wallpaper) {
  let timer = null
  window.addEventListener('storage', () => {
    clearTimeout(timer)
    timer = setTimeout(() => location.reload(), 300)
  })
}

//the windows screensaver ends on a key, a click, a turned wheel, a mouse moved past a nudge or
//another window; the preview and the wallpaper never end
const quit = () => {
  if (window.__TAURI__) window.__TAURI__.core.invoke('quit')
  else window.close()
}

const NUDGE = 8
if (!preview && !wallpaper) {
  let from = null
  window.addEventListener('pointermove', (event) => {
    if (!from) from = [event.screenX, event.screenY]
    else if (Math.hypot(event.screenX - from[0], event.screenY - from[1]) > NUDGE) quit()
  })
  for (const name of ['pointerdown', 'keydown', 'wheel', 'blur'])
    window.addEventListener(name, quit)
}
