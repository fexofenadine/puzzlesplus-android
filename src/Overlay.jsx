import { h } from 'hyperapp'
import s from './Overlay.module.css'
import d from './Dialog.module.css'
import { loadZoom } from './shell/zoom'
import { fontScale, phone } from './shell/phone'

//esc closes the dialog, so it never reaches the boss key
const keyDown = (onKeyDown) => (event) => {
  if (event.keyCode === 27 && onKeyDown) event.stopPropagation()
  if (onKeyDown) onKeyDown(event)
}

//a tap that opened the dialog sends its click afterwards to whatever is under the finger then
//so pointer clicks count only once a press began inside, keyboard clicks (detail 0) always do
export const guardClicks = (el) => {
  let pressed = false
  el.addEventListener('pointerdown', () => (pressed = true), true)
  el.addEventListener(
    'click',
    (event) => {
      if (pressed || !event.detail) return
      event.preventDefault()
      event.stopPropagation()
    },
    true,
  )
}

//a dialog is up, so keys belong to it and not to the game behind
export const dialogOpen = () => Boolean(document.querySelector(`.${s.root}`))

//the smallest a dialog shrinks to fit, below it the page scrolls sideways
const MIN_SCALE = 0.8

//the most a phone's dialog grows, where small ones stop looking oversized
const PHONE_SCALE = 1.5

//a dialog keeps the game's zoom, but no more than fits the screen's width at its natural width,
//where a phone's zoom of ~2.3 made the about box overflow; offset sizes are unzoomed everywhere
//a big board shrunk to fit doesn't shrink its dialogs with it, they keep the zoom that was chosen
const fitDialog = (el) => {
  const dialog = el.querySelector(`.${d.dialog}`)
  if (!dialog || !dialog.offsetWidth) return
  const frame = getComputedStyle(dialog.parentElement.parentElement)
  //a board too wide for the screen widens the overlay with the page, the screen is the room
  const width = Math.min(el.clientWidth, document.documentElement.clientWidth)
  const room = width - parseFloat(frame.marginLeft) - parseFloat(frame.marginRight)
  const shown = parseFloat(getComputedStyle(el).getPropertyValue('--scale')) || 1
  //a phone's dialogs grow to the screen's width whatever the board's zoom, up to PHONE_SCALE
  const scale = phone ? PHONE_SCALE : Math.max(shown, loadZoom())
  //at 100% the dialog is as wide as its text wants, up to the room
  el.style.setProperty('--scale', 1)
  dialog.style.maxWidth = ''
  const fit = Math.floor((room / dialog.offsetWidth) * 100) / 100
  let best = fit >= scale ? scale : Math.max(MIN_SCALE, fit)
  //a big system font size grows a phone's dialog by as much again, its text wrapping shorter
  //as far as what can't wrap (a table, a field, a long link) still fits
  const grow = phone ? fontScale() : 1
  if (grow > 1) {
    dialog.style.width = 'min-content'
    //tables measure a few pixels short at their least, so 3% is left spare
    const most = Math.floor((room / dialog.offsetWidth) * 97) / 100
    dialog.style.width = ''
    const bigger = Math.min(best * grow, Math.max(most, fit))
    if (bigger > best) {
      best = Math.floor(bigger * 100) / 100
      if (best > fit) dialog.style.maxWidth = `${Math.floor(room / best)}px`
    }
  }
  if (best === shown) el.style.removeProperty('--scale')
  else el.style.setProperty('--scale', best)
}

const Overlay = ({ key, onKeyDown }, children) => (
  <section
    key={key}
    class={s.root}
    tabindex={-1}
    onkeydown={keyDown(onKeyDown)}
    oncreate={(el) => {
      guardClicks(el)
      fitDialog(el)
    }}
  >
    <div class={s.table}>
      <div class={s.cell}>{children}</div>
    </div>
  </section>
)

export default Overlay
