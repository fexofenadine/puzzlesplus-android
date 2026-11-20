import { dealer } from '../shell/deal'
import { makeGame, random } from './generate'

const dealOne = dealer(
  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),
  ({ n, level, seed, budget, regions }) => makeGame(n, level, random(seed), budget, regions),
)

//budget is the search time, left out for the usual one; regions deals a jigsaw board
export const deal = (n, level, seed, budget, regions) =>
  dealOne({ n, level, seed, budget, regions })
