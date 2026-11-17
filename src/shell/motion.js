import { load, remove, save } from './storage'

//how much things move: full by default, always reduced, or as the system says
//full is the default since a system can wrongly report reduced motion (seen in an android beta's webview)
export const motions = [
  ['system', 'System Motion'],
  ['reduce', 'Reduced Motion'],
  ['full', 'Full Motion'],
]

export const loadMotion = () => {
  const saved = load('motion')
  return motions.some(([id]) => id === saved) ? saved : 'full'
}

//the root's data-motion lets the css follow the choice, none means the system's
export const applyMotion = (motion) => {
  const root = document.documentElement
  if (motion === 'system') delete root.dataset.motion
  else root.dataset.motion = motion
}

export const saveMotion = (motion) => {
  if (motion === 'full') remove('motion')
  else save('motion', motion)
  applyMotion(motion)
}

//true when fireworks, tile slides and the like should stay still
export const reduced = () => {
  const chosen = globalThis.document?.documentElement.dataset.motion || loadMotion()
  if (chosen !== 'system') return chosen === 'reduce'
  return !globalThis.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches
}
