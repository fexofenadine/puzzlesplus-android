import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

//the rules in short, for the dialog and the guide pages
export const Rules = () => [
  <p>
    Slide every tile at once with the arrow keys or W, A, S and D, or by swiping or dragging across
    the board. Two equal tiles that meet merge into one of twice the value and add it to your score.
    After each move a new 2 or 4 appears in an empty cell.
  </p>,
  <p>
    Make a 2048 tile to win (512 on 3 × 3), then keep going if you like. The game ends when the
    board is full and no two neighbours match. The left counter is your score.
  </p>,
  <p>
    Ctrl+Z undoes as many moves as you like and Hint suggests a move, but either puts the game's
    score with the helped ones. The clock is off unless you turn on Timer in the Game menu.
  </p>,
]

const TwentyHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="2048" actions={actions}>
    <Rules />
  </HowToPlay>
)

export default TwentyHowToPlay
