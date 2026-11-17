import { app } from 'hyperapp'
import { startBackgrounds } from './backgrounds'
import { registerWorker } from './worker'
import { phone } from './phone'
import { listenPinch, unpinch } from './pinch'

//a phone's new or resumed game starts at the fit, not wherever the last one was zoomed
const fitting = (actions) => {
  const own = { ...actions }
  for (const name of ['reset', 'resumeGame']) {
    const action = actions[name]
    if (action)
      own[name] = (payload) => {
        unpinch()
        return action(payload)
      }
  }
  return own
}

//a game page: its app in the page, the background behind it and the offline worker
export const start = ({ state, actions, view }) => {
  const own = phone ? fitting(actions) : actions
  app(state, own, view, document.getElementById('app'))
  if (phone) listenPinch()
  startBackgrounds()
  registerWorker()
}
