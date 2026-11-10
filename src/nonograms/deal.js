import { dealer } from '../shell/deal'
import { deal as dealWith } from './dealing'

const dealOne = dealer(
  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),
  dealWith,
)

//options: symmetric for drawn pictures, art for the pool (pick a picture by id, avoid the last)
export const deal = (n, level, seed, options = {}) => dealOne({ n, level, seed, ...options })
