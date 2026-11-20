import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed, budget, regions } }) => {
  const { givens, solution, level: got, layout } = makeGame(n, level, random(seed), budget, regions)
  self.postMessage({ id, givens, solution, level: got, layout }, [givens.buffer, solution.buffer])
}
