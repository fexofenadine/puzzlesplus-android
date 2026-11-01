import { h } from 'hyperapp'
import s from './Overlay.module.css'
import d from './Dialog.module.css'

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

//the smallest a dialog shrinks to fit, below it the page scrolls sideways
const MIN_SCALE = 0.8

//a dialog keeps the game's zoom, but no more than fits the screen's width at its natural width,
//where a phone's zoom of ~2.3 made the about box overflow; offset sizes are unzoomed everywhere
export const fitDialog = (el) => {
  const dialog = el.querySelector(`.${d.dialog}`)
  if (!dialog || !dialog.offsetWidth) return
  const frame = getComputedStyle(dialog.parentElement.parentElement)
  const room = el.clientWidth - parseFloat(frame.marginLeft) - parseFloat(frame.marginRight)
  const scale = parseFloat(getComputedStyle(el).getPropertyValue('--scale')) || 1
  //at 100% the dialog is as wide as its text wants, up to the room
  el.style.setProperty('--scale', 1)
  const fit = Math.floor((room / dialog.offsetWidth) * 100) / 100
  if (fit >= scale) el.style.removeProperty('--scale')
  else el.style.setProperty('--scale', Math.max(MIN_SCALE, fit))
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
