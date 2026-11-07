import { h } from 'hyperapp'
import About, { Link } from '../shell/About'

const SudokuAbout = ({ key, actions }) => (
  <About key={key} name="Sudoku Plus" actions={actions}>
    <p>
      Number placement puzzles: fill the grid so every row, column and box holds each digit from 1
      to 9 exactly once.
    </p>
    <p>
      Every board has exactly one solution and can be solved by logic alone, graded by the hardest
      technique it needs. The puzzle was devised by Howard Garns as Number Place in 1979 and named
      Sudoku by Nikoli in 1984.
    </p>
    <p>
      Part of Puzzles Plus by fexofenadine, sharing its window, themes and backgrounds with
      Minesweeper Plus, which is based on{' '}
      <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir Kutepov.
    </p>
  </About>
)

export default SudokuAbout
