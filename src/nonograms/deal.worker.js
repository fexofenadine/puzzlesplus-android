import { deal } from './dealing'

self.onmessage = ({ data }) => {
  const { solution, clues, level, art } = deal(data)
  self.postMessage({ id: data.id, solution, clues, level, art }, [solution.buffer])
}
