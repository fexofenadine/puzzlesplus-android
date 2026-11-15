import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

//the rules in short, for the dialog and the guide pages
export const Rules = () => [
  <p>
    Fill the empty cells so every row and every column holds each digit once, 1 to 5 on a 5 × 5
    board. A sign between two cells says which of them is the smaller: it opens toward the larger
    digit, as in 2 &lt; 4. The digits in bold are the puzzle's own and can't be changed.
  </p>,
  <p>
    Select a cell, then pick a digit on the pad below the board or type it. Picking the same digit
    again clears it. With no cell selected, a pad digit stays picked and every cell you tap gets it.
    The arrow keys move the selection, and Backspace, Delete or 0 erases.
  </p>,
  <p>
    Notes are small candidate digits: turn on Notes on the pad (or press Space) and digits become
    notes, or hold Shift while typing one, or right click a cell with a digit picked. Auto Notes
    fills in every digit a cell's row and column still allow, and placing a digit takes it out of
    the notes it rules out.
  </p>,
  <p>
    The left counter shows the cells still empty and Ctrl+Z undoes, Ctrl+Y redoes. Show Errors marks
    a digit that repeats in a row or column and digits the wrong way round for their sign, and Hint
    explains the next digit logic gives. Every board has one solution that needs no guessing.
  </p>,
]

const FutoshikiHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Futoshiki" actions={actions}>
    <Rules />
  </HowToPlay>
)

export default FutoshikiHowToPlay
