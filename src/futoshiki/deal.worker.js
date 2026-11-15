import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed, budget } }) => {
  const { givens, right, down, solution, level: got } = makeGame(n, level, random(seed), budget)
  self.postMessage({ id, givens, right, down, solution, level: got })
}
