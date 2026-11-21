import d from '../Dialog.module.css'
import s from './moveWindow.module.css'

//windows and dialogs move by their title bar as on windows 95 without "show window contents
//while dragging": a dotted outline follows the mouse and the window jumps there on release
//the offset sits on the dialog's unzoomed frame as --move-x and --move-y, kept until a reload

//pixels the mouse goes before a press on the title bar becomes a move
const THRESHOLD = 4
//pixels of a window kept on screen at the sides, and of its title bar at the bottom
const EDGE = 40
const TITLE = 18

//the screen a window may go on: the page above the taskbar
const roomOf = () => {
  const main = document.querySelector('main')
  const taskbar = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0
  return { width: document.documentElement.clientWidth, height: window.innerHeight - taskbar }
}

//a window as big as the screen either way (maximised, or one the page scrolls for) stays put
export const tooBig = (rect, room) => rect.width >= room.width - 4 || rect.height >= room.height - 4

//the move as far as it may go: the title bar stays on screen, and some of the window at the sides
export const clampMove = (rect, dx, dy, room) => {
  const left = Math.min(Math.max(rect.left + dx, EDGE - rect.width), room.width - EDGE)
  const top = Math.min(Math.max(rect.top + dy, 0), room.height - TITLE)
  return [Math.round(left - rect.left), Math.round(top - rect.top)]
}

const offsetOf = (frame) => [
  parseFloat(frame.style.getPropertyValue('--move-x')) || 0,
  parseFloat(frame.style.getPropertyValue('--move-y')) || 0,
]

const moved = new Set()
let observer = null

const setOffset = (frame, x, y) => {
  if (!x && !y) {
    frame.style.removeProperty('--move-x')
    frame.style.removeProperty('--move-y')
    moved.delete(frame)
    return
  }
  frame.style.setProperty('--move-x', `${x}px`)
  frame.style.setProperty('--move-y', `${y}px`)
  if (!moved.has(frame)) watch(frame)
  moved.add(frame)
}

//a moved window that grows, maximises or loses room is pulled back on screen, or back home
const settle = () => {
  const room = roomOf()
  for (const frame of moved) {
    const dialog = frame.querySelector(`.${d.dialog}`)
    if (!frame.isConnected || !dialog) {
      moved.delete(frame)
      if (observer) observer.unobserve(frame)
      continue
    }
    const rect = dialog.getBoundingClientRect()
    if (!rect.width) continue
    const [x, y] = offsetOf(frame)
    if (tooBig(rect, room)) setOffset(frame, 0, 0)
    else {
      const [dx, dy] = clampMove(rect, 0, 0, room)
      if (dx || dy) setOffset(frame, x + dx, y + dy)
    }
  }
}

const watch = (frame) => {
  if (!observer) {
    window.addEventListener('resize', settle)
    if (window.ResizeObserver) observer = new ResizeObserver(settle)
  }
  if (observer) observer.observe(frame)
}

//the title bar's pointerdown: mouse only, never from its buttons
export const startMove = (event) => {
  if (event.button !== 0 || event.pointerType !== 'mouse') return
  if (event.target.closest('button')) return
  const header = event.currentTarget
  const frame = header.closest(`.${d.b}`)
  const dialog = header.closest(`.${d.dialog}`)
  if (!frame || !dialog) return
  const rect = dialog.getBoundingClientRect()
  const room = roomOf()
  if (tooBig(rect, room)) return
  const start = [event.clientX, event.clientY]
  let shift = null
  let outline = null
  const draw = () => {
    outline.style.left = `${rect.left + shift[0]}px`
    outline.style.top = `${rect.top + shift[1]}px`
  }
  const move = (e) => {
    const dx = e.clientX - start[0]
    const dy = e.clientY - start[1]
    if (!outline) {
      if (Math.hypot(dx, dy) < THRESHOLD) return
      outline = document.createElement('div')
      outline.className = s.outline
      outline.style.width = `${rect.width}px`
      outline.style.height = `${rect.height}px`
      document.body.append(outline)
    }
    shift = clampMove(rect, dx, dy, room)
    draw()
  }
  //esc lets go without moving, and never reaches the boss key or the dialog
  const key = (e) => {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    end(null)
  }
  const end = (e) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('keydown', key, true)
    if (!outline) return
    outline.remove()
    if (e && e.type === 'pointerup') {
      const [x, y] = offsetOf(frame)
      setOffset(frame, x + shift[0], y + shift[1])
    }
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
  window.addEventListener('keydown', key, true)
}
