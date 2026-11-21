import { releaseDate, version } from '../../package.json'

//the version the about boxes show, from package.json, and the day it was released
export { version }

export const released = new Date(`${releaseDate}T00:00:00Z`).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

//the list of what changed in each release
export const changelog = 'https://github.com/fexofenadine/puzzlesplus/blob/master/CHANGELOG.md'
