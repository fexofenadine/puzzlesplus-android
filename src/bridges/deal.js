import { dealer } from '../shell/deal'
import { makeGame, random } from './generate'

const dealOne = dealer(
  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),
  ({ n, level, seed, budget }) => makeGame(n, level, random(seed), budget),
)

//budget is the search time, left out for the usual one
export const deal = (n, level, seed, budget) => dealOne({ n, level, seed, budget })
