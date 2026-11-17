import { boardWindow } from './zoom'

//pinch zoom on a phone: two fingers zoom the board and move it round, one finger plays
//the board is scaled by a transform on the window's unzoomed wrapper, on top of its fitted zoom,
//so layout, fitting and hit testing by elementFromPoint all carry on as they were

//a lone press waits this long for a second finger before it reaches the game
const WAIT = 100
//or until it has moved this far, so drags start at once
const MOVE = 8

const root = document.documentElement

//the zoom on top of the fit, and the board's offset
let k = 1
let tx = 0
let ty = 0
//the first finger's press while it waits
let held = null
//touch pointers followed since they landed on the game
const fingers = new Set()
//once a second finger lands, every finger is the pinch's until all are lifted
let pinching = false
let pinch = null
let chip = null
let watched = null

const box = () => {
  const dialog = boardWindow()
  return dialog && dialog.isConnected ? dialog.parentElement : null
}

//a press on the board or the wallpaper round it, not on a dialog, the bars or the panels
const onGame = (target) =>
  target instanceof Element &&
  Boolean(box()) &&
  Boolean(target.closest('main')) &&
  !target.closest('[class*="Overlay_root"], [class*="PhoneBar_"]')

const apply = () => {
  const el = box()
  if (!el) return
  const zoomed = k > 1 || tx || ty
  el.style.transformOrigin = '0 0'
  el.style.transform = zoomed ? `translate(${tx}px, ${ty}px) scale(${k})` : ''
  if (zoomed) root.dataset.pinched = ''
  else delete root.dataset.pinched
  if (chip) chip.hidden = !zoomed
}

//back to the fitted board, gliding when asked
export const unpinch = (glide = false) => {
  const el = box()
  k = 1
  tx = 0
  ty = 0
  pinch = null
  if (el && glide) {
    el.style.transition = 'transform 0.2s'
    setTimeout(() => (el.style.transition = ''), 200)
  }
  apply()
}

//the board's place on screen without the transform, and the room between the bars
const frame = (el) => {
  const rect = el.getBoundingClientRect()
  const main = getComputedStyle(el.closest('main'))
  return {
    x: rect.left - tx,
    y: rect.top - ty,
    w: el.offsetWidth,
    h: el.offsetHeight,
    left: parseFloat(main.paddingLeft) || 0,
    top: parseFloat(main.paddingTop) || 0,
    right: innerWidth - (parseFloat(main.paddingRight) || 0),
    bottom: innerHeight - (parseFloat(main.paddingBottom) || 0),
  }
}

//a board bigger than the room can't leave a gap at its edges, a smaller one stays inside it
const keepIn = (at, size, low, high) =>
  size > high - low
    ? Math.min(low, Math.max(high - size, at))
    : Math.max(low, Math.min(high - size, at))

//cells up to about five times their size, but always half as big again as the fit
const most = () => {
  const scale = parseFloat(getComputedStyle(root).getPropertyValue('--scale')) || 1
  return Math.min(4, Math.max(1.5, 5 / scale))
}

const middle = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 })
const apart = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

//a new board size goes back to the fit; a hint panel only makes the window taller
const watch = (el) => {
  const dialog = boardWindow()
  if (watched === dialog || typeof ResizeObserver === 'undefined') return
  watched = dialog
  let width = dialog.offsetWidth
  new ResizeObserver(() => {
    if (dialog.offsetWidth === width) return
    width = dialog.offsetWidth
    unpinch()
  }).observe(dialog)
  el.style.transformOrigin = '0 0'
}

const begin = (a, b) => {
  const el = box()
  if (!el) return
  watch(el)
  const f = frame(el)
  const m = middle(a, b)
  //the board's own point under the fingers, which stays under them
  pinch = { f, d: apart(a, b) || 1, k, x: (m.x - f.x - tx) / k, y: (m.y - f.y - ty) / k }
  el.style.willChange = 'transform'
}

const follow = (a, b) => {
  const { f, d, k: k0, x, y } = pinch
  const m = middle(a, b)
  k = Math.min(most(), Math.max(1, (k0 * apart(a, b)) / d))
  //where the board's edge goes so that point is under the fingers' middle, kept in the room
  tx = keepIn(m.x - k * x, k * f.w, f.left, f.right) - f.x
  ty = keepIn(m.y - k * y, k * f.h, f.top, f.bottom) - f.y
  if (k === 1) {
    tx = 0
    ty = 0
  }
  apply()
}

const end = () => {
  if (!pinch) return
  pinch = null
  const el = box()
  //drawn sharp again at the new size
  if (el) el.style.willChange = ''
  if (k < 1.02) unpinch(true)
}

//the held press reaches the game as it was
const release = () => {
  if (!held) return
  const { event } = held
  clearTimeout(held.timer)
  held = null
  event.target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      isPrimary: event.isPrimary,
      clientX: event.clientX,
      clientY: event.clientY,
      screenX: event.screenX,
      screenY: event.screenY,
      button: event.button,
      buttons: event.buttons,
      width: event.width,
      height: event.height,
      pressure: event.pressure,
    }),
  )
}

const down = (event) => {
  if (event.pointerType !== 'touch' || !event.isTrusted) return
  if (pinching) {
    fingers.add(event.pointerId)
    event.stopImmediatePropagation()
    return
  }
  if (!fingers.size) {
    if (!onGame(event.target)) return
    fingers.add(event.pointerId)
    event.stopImmediatePropagation()
    held = { event, timer: setTimeout(release, WAIT) }
    return
  }
  //a second finger: a press still held never happens, one already let through is called off
  event.stopImmediatePropagation()
  pinching = true
  if (held) {
    clearTimeout(held.timer)
    held = null
  } else {
    for (const pointerId of fingers) {
      window.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerId, pointerType: 'touch' }),
      )
    }
  }
  fingers.add(event.pointerId)
}

const move = (event) => {
  if (event.pointerType !== 'touch' || !event.isTrusted || !fingers.has(event.pointerId)) return
  if (pinching) event.stopImmediatePropagation()
  else if (held) {
    const { clientX, clientY } = held.event
    if (Math.hypot(event.clientX - clientX, event.clientY - clientY) > MOVE) release()
    else event.stopImmediatePropagation()
  }
}

const up = (event) => {
  if (event.pointerType !== 'touch' || !event.isTrusted || !fingers.has(event.pointerId)) return
  release()
  if (pinching) event.stopImmediatePropagation()
  fingers.delete(event.pointerId)
  if (!fingers.size) pinching = false
}

//touch events come after each finger's pointer events, so by now the pinch has begun
//minesweeper's hold listens to touches, a cancel ends it
const touchStart = (event) => {
  if (!pinching || !event.isTrusted) return
  event.stopImmediatePropagation()
  if (event.cancelable) event.preventDefault()
  if (!pinch) window.dispatchEvent(new TouchEvent('touchcancel', { bubbles: true }))
  if (event.touches.length >= 2) begin(event.touches[0], event.touches[1])
}

const touchMove = (event) => {
  if (!pinching || !event.isTrusted) return
  event.stopImmediatePropagation()
  if (event.cancelable) event.preventDefault()
  if (pinch && event.touches.length >= 2) follow(event.touches[0], event.touches[1])
}

const touchEnd = (event) => {
  if (!pinching && !pinch) return
  if (event.isTrusted) event.stopImmediatePropagation()
  if (event.touches.length < 2) end()
  //a finger put back down with one still on carries on from here
  else begin(event.touches[0], event.touches[1])
}

//the way back to the fit once zoomed, under the board's corner
const makeChip = () => {
  chip = document.createElement('button')
  chip.type = 'button'
  chip.className = 'pinch-fit'
  chip.textContent = 'Fit'
  chip.setAttribute('aria-label', 'Fit the board to the screen')
  chip.hidden = true
  chip.addEventListener('click', () => unpinch(true))
  document.body.append(chip)
}

export const listenPinch = () => {
  makeChip()
  const capture = { capture: true }
  const active = { capture: true, passive: false }
  window.addEventListener('pointerdown', down, capture)
  window.addEventListener('pointermove', move, capture)
  window.addEventListener('pointerup', up, capture)
  window.addEventListener('pointercancel', up, capture)
  window.addEventListener('touchstart', touchStart, active)
  window.addEventListener('touchmove', touchMove, active)
  window.addEventListener('touchend', touchEnd, capture)
  window.addEventListener('touchcancel', touchEnd, capture)
  window.addEventListener('resize', () => unpinch())
}
