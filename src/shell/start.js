import { app } from 'hyperapp'
import { startBackgrounds } from './backgrounds'
import { registerWorker } from './worker'

//a game page: its app in the page, the background behind it and the offline worker
export const start = ({ state, actions, view }) => {
  app(state, actions, view, document.getElementById('app'))
  startBackgrounds()
  registerWorker()
}
