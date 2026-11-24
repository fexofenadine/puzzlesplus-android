import { load, save } from '../shell/storage'
import { themes } from '../shell/themes'

//the screensaver's and the android wallpaper's own options: a theme picked at random and changed
//every so many minutes, and for the wallpaper its frame rate and drift with the home screens
export const MINUTES = { min: 1, max: 60, step: 1 }
export const rates = [
  [15, '15 fps'],
  [20, '20 fps'],
  [30, '30 fps'],
  [60, '60 fps'],
  [0, 'As the screen allows'],
]

//drift is off at first: the background staying put as the home screens slide was found distracting
//30 fps at first: the backgrounds move slowly, and half the frames is a real saving on a phone
//battery saver slows the wallpaper to the lowest rate unless switched off
const defaultOptions = () => ({ random: false, minutes: 5, fps: 30, drift: false, saver: true })

//the frame cap while android's battery saver is on
export const SAVER_FPS = 15

export const loadOptions = () => {
  const options = defaultOptions()
  try {
    const saved = JSON.parse(load('screensaver')) || {}
    if (typeof saved.random === 'boolean') options.random = saved.random
    if (typeof saved.drift === 'boolean') options.drift = saved.drift
    if (typeof saved.saver === 'boolean') options.saver = saved.saver
    const minutes = Number(saved.minutes)
    if (Number.isInteger(minutes) && minutes >= MINUTES.min && minutes <= MINUTES.max)
      options.minutes = minutes
    if (rates.some(([fps]) => fps === saved.fps)) options.fps = saved.fps
  } catch {
    //nothing saved, or not readable
  }
  return options
}

export const saveOptions = (options) => save('screensaver', JSON.stringify(options))

//any theme but the one showing
export const randomTheme = (current, rng = Math.random) => {
  const others = themes.map(([id]) => id).filter((id) => id !== current)
  return others[Math.floor(rng() * others.length)]
}
