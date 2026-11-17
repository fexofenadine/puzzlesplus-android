import { load, remove, save } from './storage'

//how much things move: as the system says, always reduced or always full
//a system that wrongly reports reduced motion (seen in an android beta's webview) can be overruled
export const motions = [
  ['system', 'System Motion'],
  ['reduce', 'Reduced Motion'],
  ['full', 'Full Motion'],
]

export const loadMotion = () => {
  const saved = load('motion')
  return motions.some(([id]) => id === saved) ? saved : 'system'
}

//the root's data-motion lets the css follow the choice, none means the system's
export const applyMotion = (motion) => {
  const root = document.documentElement
  if (motion === 'system') delete root.dataset.motion
  else root.dataset.motion = motion
}

export const saveMotion = (motion) => {
  if (motion === 'system') remove('motion')
  else save('motion', motion)
  applyMotion(motion)
}

//true when fireworks, tile slides and the like should stay still
export const reduced = () => {
  const chosen = globalThis.document?.documentElement.dataset.motion
  if (chosen) return chosen === 'reduce'
  return !globalThis.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches
}
