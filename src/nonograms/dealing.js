import { pickArt } from './art'
import { makeGame, random } from './generate'

//one deal, on the page or in the worker: a picture from the pool when art is asked for and the
//size has one, otherwise a drawn board
export const deal = ({
  n,
  level,
  seed,
  art = false,
  pick = null,
  avoid = null,
  symmetric = true,
}) => {
  const rng = random(seed)
  const found = art && pickArt(n, level, rng, pick, avoid)
  return found || makeGame(n, level, rng, undefined, symmetric)
}
