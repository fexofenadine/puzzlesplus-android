import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed, budget } }) => {
  const { islands, solution, level: got } = makeGame(n, level, random(seed), budget)
  self.postMessage({ id, islands, solution, level: got }, [islands.buffer, solution.buffer])
}
