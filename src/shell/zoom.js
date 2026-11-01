import { load, save } from './storage'

const root = document.documentElement

//zoom levels the view menu steps through
export const steps = [0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4]

//smallest readable fit, about 10px cells; below it the page scrolls
export const MIN_FIT = 0.625

export const loadZoom = () => {
  const scale = parseFloat(load('scale'))
  return Number.isFinite(scale) ? Math.min(4, Math.max(0.5, scale)) : 1
}

export const stepZoom = (scale, direction) =>
  direction > 0
    ? (steps.find((step) => step > scale + 0.001) ?? steps[steps.length - 1])
    : (steps.findLast((step) => step < scale - 0.001) ?? steps[0])

//the chosen zoom shrunk to fit, in 0.02 steps so it cannot flicker
export const fitZoom = (chosen, fit) =>
  fit >= chosen ? chosen : Math.min(chosen, Math.max(MIN_FIT, Math.floor(fit * 50) / 50))

//maximised fills the room whatever the steps, still never below the smallest fit
export const maxZoom = (fit) => Math.max(MIN_FIT, Math.floor(fit * 100) / 100)

export const loadMaximised = () => load('maximised') === 'yes'

export const saveMaximised = (maximised) => save('maximised', maximised ? 'yes' : '')

export const applyZoom = (scale) => root.style.setProperty('--scale', scale)

export const saveZoom = (scale) => save('scale', scale)

let gameWindow = null
//unzoomed pixels of explanation panel below the board, left out of layout and fitting
let hanging = 0

//the largest zoom that fits, and the window's unzoomed size and room
//offset sizes are unzoomed in every engine, rects only since chrome 128 (android 15's first
//webview, 124, left them unzoomed, so dividing by the zoom shrank the window and fit never settled)
export const measureFit = () => {
  if (!gameWindow || !gameWindow.offsetWidth || !gameWindow.offsetHeight) {
    return { fit: Infinity, size: null }
  }
  //the margin is outside the zoom; inner sizes ignore scrollbars
  const frame = getComputedStyle(gameWindow.parentElement.parentElement)
  const width = innerWidth - parseFloat(frame.marginLeft) - parseFloat(frame.marginRight)
  //the taskbar's room is main's bottom padding, a phone's top bar its top padding
  const main = getComputedStyle(gameWindow.closest('main'))
  const bar = (parseFloat(main.paddingBottom) || 0) + (parseFloat(main.paddingTop) || 0)
  const height = innerHeight - parseFloat(frame.marginTop) - parseFloat(frame.marginBottom) - bar
  const size = {
    width: gameWindow.offsetWidth,
    height: gameWindow.offsetHeight - hanging,
    room: `${width}x${height}`,
  }
  //borders and text do not scale exactly, so leave 1% to spare
  return { fit: Math.min(width / size.width, height / size.height) * 0.99, size }
}

//the unzoomed size drifts ~1% between zooms, so only bigger changes count
export const sameSize = (a, b) =>
  Boolean(a && b) &&
  a.room === b.room &&
  Math.abs(a.width / b.width - 1) < 0.03 &&
  Math.abs(a.height / b.height - 1) < 0.03

//the explanation under the board hangs below the window's place instead of growing it
//so the board never moves under the pointer when one appears or goes, nor does the zoom
//measured inside the window, so unzoomed; the margin outside it scales by the zoom
const bottom = (el) => el.offsetTop + el.offsetHeight
const hang = (panel) => {
  const height = panel ? bottom(panel) - bottom(panel.previousElementSibling) : 0
  if (!gameWindow || Math.abs(height - hanging) < 0.5) return
  hanging = height
  gameWindow.parentElement.style.marginBottom = height
    ? `calc(env(safe-area-inset-bottom) - ${height}px * var(--scale, 1))`
    : ''
}

//lifecycle for the panel element
export const hangBelow = {
  oncreate: (panel) => hang(panel),
  onupdate: (panel) => hang(panel),
  ondestroy: () => hang(null),
}

//refit when the window or browser changes size
export const watchWindow = (dialog, refit) => {
  gameWindow = dialog
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => refit()).observe(dialog)
  window.addEventListener('resize', () => refit())
}
