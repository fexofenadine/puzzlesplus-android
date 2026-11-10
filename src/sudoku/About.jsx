import { h } from 'hyperapp'
import About from '../shell/About'

const SudokuAbout = ({ key, actions }) => (
  <About key={key} name="Sudoku Plus" actions={actions}>
    <p>
      Number placement puzzles: fill the grid so every row, column and box holds each digit exactly
      once, on the classic 9×9 board or a smaller 6×6 or 4×4.
    </p>
    <p>
      Four levels, each board with exactly one solution that logic alone finds, graded by the
      hardest technique it needs, from singles to swordfish. Notes, Auto Notes and hints that
      explain their reasoning and link to the guide.
    </p>
    <p>
      The puzzle was devised by Howard Garns as Number Place in 1979 and named Sudoku by Nikoli in
      1984.
    </p>
  </About>
)

export default SudokuAbout
