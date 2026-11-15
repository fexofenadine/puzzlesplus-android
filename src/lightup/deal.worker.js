import { makeGame, random } from './generate'

self.onmessage = ({ data: { id, n, level, seed, budget } }) => {
  const { layout, solution, level: got } = makeGame(n, level, random(seed), budget)
  self.postMessage({ id, layout, solution, level: got }, [layout.buffer, solution.buffer])
}
