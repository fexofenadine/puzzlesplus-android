import { h } from 'hyperapp'
import About from '../shell/About'

const TakuzuAbout = ({ key, actions }) => (
  <About key={key} name="Takuzu Plus" actions={actions}>
    <p>
      Binary puzzles: fill the grid with 0s and 1s so that no row or column has three alike in a
      row, every row and column holds as many 0s as 1s, and no two rows or two columns are the same.
    </p>
    <p>
      Boards from 6 × 6 to 14 × 14 in five levels, each with exactly one solution that logic alone
      finds, graded by the hardest technique it needs. Hints explain their reasoning and link to the
      guide.
    </p>
    <p>Takuzu, also known as Binairo, was devised by Frank Coussement and Peter De Schepper.</p>
  </About>
)

export default TakuzuAbout
