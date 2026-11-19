import { afterEach, expect, it } from 'vitest'
import d from '../Dialog.module.css'
import { clampMove, startMove, tooBig } from './moveWindow'

const room = { width: 1000, height: 700 }
const rect = { left: 300, top: 200, width: 400, height: 300 }

afterEach(() => {
  document.body.innerHTML = ''
})

it('keeps the title bar on screen and some of the window at the sides', () => {
  expect(clampMove(rect, 50, -20, room)).toEqual([50, -20])
  expect(clampMove(rect, 0, -500, room)).toEqual([0, -200])
  expect(clampMove(rect, 0, 900, room)).toEqual([0, 700 - 18 - 200])
  expect(clampMove(rect, -2000, 0, room)).toEqual([40 - 400 - 300, 0])
  expect(clampMove(rect, 2000, 0, room)).toEqual([1000 - 40 - 300, 0])
  expect(tooBig(rect, room)).toBe(false)
  expect(tooBig({ ...rect, width: 1000 }, room)).toBe(true)
  expect(tooBig({ ...rect, height: 698 }, room)).toBe(true)
})

//a dialog in the page, as Dialog.jsx draws it, at the rect above
const dialog = () => {
  document.body.innerHTML = `<div class="${d.a}"><div class="${d.b}"><div class="${d.dialog}"><div class="${d.header}"><h1>Title</h1><button>x</button></div></div></div></div>`
  const box = document.querySelector(`.${d.dialog}`)
  box.getBoundingClientRect = () => rect
  Object.defineProperty(document.documentElement, 'clientWidth', {
    value: 1000,
    configurable: true,
  })
  window.innerHeight = 700
  return document.querySelector(`.${d.header}`)
}

const press = (header, target, x, y) =>
  startMove({
    button: 0,
    pointerType: 'mouse',
    target,
    currentTarget: header,
    clientX: x,
    clientY: y,
  })

const send = (type, x, y) => window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }))

it('moves a window by its title bar once the mouse lets go, showing only an outline till then', () => {
  const header = dialog()
  const frame = document.querySelector(`.${d.b}`)
  press(header, header.querySelector('h1'), 100, 100)
  send('pointermove', 102, 101)
  //a few pixels is still a click (or the double click that zooms)
  expect(document.querySelector('[class*=outline]')).toBe(null)
  send('pointermove', 160, 130)
  expect(document.querySelector('[class*=outline]').style.left).toBe('360px')
  expect(frame.style.getPropertyValue('--move-x')).toBe('')
  send('pointerup', 160, 130)
  expect(document.querySelector('[class*=outline]')).toBe(null)
  expect(frame.style.getPropertyValue('--move-x')).toBe('60px')
  expect(frame.style.getPropertyValue('--move-y')).toBe('30px')
})

it('leaves the window where it was on esc, a touch, or a press on a title bar button', () => {
  const header = dialog()
  const frame = document.querySelector(`.${d.b}`)
  press(header, header, 100, 100)
  send('pointermove', 200, 200)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  send('pointerup', 200, 200)
  expect(frame.style.getPropertyValue('--move-x')).toBe('')
  startMove({ button: 0, pointerType: 'touch', target: header, currentTarget: header })
  press(header, header.querySelector('button'), 100, 100)
  send('pointermove', 200, 200)
  expect(document.querySelector('[class*=outline]')).toBe(null)
})
