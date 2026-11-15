import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

//the rules in short, for the dialog and the guide pages
export const Rules = () => [
  <p>
    Put bulbs on the white cells until every white cell is lit. A bulb lights its own cell and its
    row and column as far as the next wall. No bulb may light another bulb, and a wall with a number
    has exactly that many bulbs in the cells beside it, above, below, left and right.
  </p>,
  <p>
    Click a cell for a bulb, again for a cross and again to clear it, right click to step back.
    Crosses are notes for yourself that no bulb goes there, and the win never needs them. On a
    keyboard the arrow keys move a cursor, Space steps its cell, B puts a bulb, X a cross and
    Backspace clears it.
  </p>,
  <p>
    The left counter shows the cells still dark, Ctrl+Z undoes and Ctrl+Y redoes. Show Errors marks
    bulbs that light each other and walls with too many bulbs or too little room, and Hint explains
    the next step logic gives. Every board has one solution that needs no guessing.
  </p>,
]

const LightUpHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Light Up" actions={actions}>
    <Rules />
  </HowToPlay>
)

export default LightUpHowToPlay
