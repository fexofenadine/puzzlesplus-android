import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

//the rules in short, for the dialog and the guide pages
export const Rules = () => [
  <p>
    Fill the empty cells so every row, every column and every 3×3 box holds each digit from 1 to 9
    exactly once. The digits in bold are the puzzle's own and can't be changed.
  </p>,
  <p>
    Select a cell, then pick a digit on the pad below the board or type it. Picking the same digit
    again clears it. With no cell selected, a pad digit stays picked and every cell you tap gets it.
    The arrow keys move the selection, and Backspace, Delete or 0 erases.
  </p>,
  <p>
    Notes are small candidate digits: turn on Notes on the pad (or press Space) and digits become
    notes, or hold Shift while typing one, or right click a cell with a digit picked. Auto Notes
    fills in every candidate, and placing a digit takes it out of the notes it rules out.
  </p>,
  <p>
    The left counter shows the cells still empty and Ctrl+Z undoes. Show Errors marks a digit that
    repeats in a row, column or box, and Hint explains the next digit logic gives. Every board has
    one solution that needs no guessing.
  </p>,
]

const SudokuHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Sudoku" actions={actions}>
    <Rules />
  </HowToPlay>
)

export default SudokuHowToPlay
