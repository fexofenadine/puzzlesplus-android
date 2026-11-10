import { h } from 'hyperapp'
import About from './shell/About'

const MinesweeperAbout = ({ key, actions }) => (
  <About key={key} name="Minesweeper Plus" actions={actions}>
    <p>
      Open every square that hides no mine, from Beginner to Extreme or a field of your own size.
    </p>
    <p>
      No Guessing deals boards that logic alone can clear, Hint explains the next safe move from the
      numbers you can see, and a chord that opens nothing says why. Best times are kept apart for
      games with and without hints.
    </p>
  </About>
)

export default MinesweeperAbout
