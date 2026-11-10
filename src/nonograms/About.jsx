import { h } from 'hyperapp'
import About from '../shell/About'

const NonogramsAbout = ({ key, actions }) => (
  <About
    key={key}
    name="Nonograms Plus"
    actions={actions}
    credits={[<li>The pictures are drawn for Puzzles Plus and free to reuse (CC0).</li>]}
  >
    <p>
      Picture logic puzzles: the numbers beside each row and above each column give the lengths of
      its runs of filled cells, in order, with at least one empty cell between runs. Fill the cells
      that match every clue.
    </p>
    <p>
      Boards from 5 × 5 to 25 × 25 in four levels, drawn at random or picked from a pool of
      pictures, each with exactly one solution that logic alone finds. Hints explain their reasoning
      and link to the guide.
    </p>
    <p>Nonograms were devised in 1987 by Non Ishida and, independently, Tetsuya Nishio.</p>
  </About>
)

export default NonogramsAbout
