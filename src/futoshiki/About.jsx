import { h } from 'hyperapp'
import About from '../shell/About'

const FutoshikiAbout = ({ key, actions }) => (
  <About key={key} name="Futoshiki Plus" actions={actions}>
    <p>
      Fill the grid so every row and column holds each digit once, with the signs between cells
      saying which neighbour is the smaller.
    </p>
    <p>
      Boards from 4 × 4 to 7 × 7 in four levels, each with exactly one solution that logic alone
      finds, graded by the hardest technique it needs. Notes, hints that explain their reasoning and
      a guide to every technique.
    </p>
    <p>Futoshiki, "not equal" in Japanese, was devised by Tamaki Seto.</p>
  </About>
)

export default FutoshikiAbout
