import { load, save } from '../shell/storage'
import { themes } from '../shell/themes'

//the screensaver's and the android wallpaper's own options: a theme picked at random and changed
//every so many minutes, and for the wallpaper its frame rate and drift with the home screens
export const MINUTES = { min: 1, max: 60, step: 1 }
export const rates = [
  [30, '30 a second'],
  [60, '60 a second'],
  [0, 'As the screen allows'],
]

export const defaultOptions = () => ({ random: false, minutes: 5, fps: 60, drift: true })

export const loadOptions = () => {
  const options = defaultOptions()
  try {
    const saved = JSON.parse(load('screensaver')) || {}
    if (typeof saved.random === 'boolean') options.random = saved.random
    if (typeof saved.drift === 'boolean') options.drift = saved.drift
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
