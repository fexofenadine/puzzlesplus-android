//tile movement on the elements themselves, outside the render
//slides start from wherever a tile is on screen, so quick moves never jump

const still = () => !globalThis.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches

//one cell and gap in the tile's own pixels
const stepOf = (element) => {
  const board = element.parentNode && element.parentNode.parentNode
  const gap = board ? parseFloat(getComputedStyle(board).columnGap) || 0 : 0
  return element.offsetWidth + gap
}

//where a drag or a running slide has the tile, in pixels off its place
const offsetOf = (element) => {
  const value = element.style.translate || getComputedStyle(element).translate
  if (!value || value === 'none') return [0, 0]
  const [x, y = '0'] = value.split(' ')
  return [parseFloat(x) || 0, parseFloat(y) || 0]
}

//slides a tile that moved from cell from to cell to (in cells), starting where it is on screen
//a released drag eases out from the finger's speed, a key press eases in and out like the original
export const glide = (element, from, to) => {
  const moved = from[0] !== to[0] || from[1] !== to[1]
  if (!moved && !element.style.translate) return
  if (!element.animate || still()) {
    element.style.translate = ''
    return
  }
  const step = stepOf(element)
  const [ox, oy] = offsetOf(element)
  const dx = (from[0] - to[0]) * step + ox
  const dy = (from[1] - to[1]) * step + oy
  const dragged = Boolean(element.style.translate)
  element.style.translate = ''
  if (element.glide) element.glide.cancel()
  if (!dx && !dy) return
  //the rest of a drag takes as long as its share of a 120 ms slide, never under 60 ms
  const left = Math.hypot(dx, dy) / step
  element.glide = element.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
    duration: dragged ? Math.max(60, Math.min(120, left * 120)) : 100,
    easing: dragged ? 'cubic-bezier(0.2, 0.6, 0.35, 1)' : 'ease-in-out',
    fill: 'backwards',
  })
}

const tilesOf = (board) =>
  board && board.querySelectorAll ? board.querySelectorAll('[data-id]') : []

//holds each tile offsets[id] cells off its place while a finger drags
export const hold = (board, offsets) => {
  for (const element of tilesOf(board)) {
    const offset = offsets[element.dataset.id]
    if (!offset) continue
    if (element.glide) element.glide.finish()
    const step = stepOf(element)
    element.style.translate = `${offset[0] * step}px ${offset[1] * step}px`
  }
}

//lets held tiles spring back to their places
export const letGo = (board) => {
  for (const element of tilesOf(board)) {
    if (!element.style.translate) continue
    const [ox, oy] = offsetOf(element)
    element.style.translate = ''
    if (!element.animate || still()) continue
    element.glide = element.animate([{ translate: `${ox}px ${oy}px` }, { translate: '0 0' }], {
      duration: 150,
      easing: 'cubic-bezier(0.2, 0.6, 0.35, 1)',
    })
  }
}
