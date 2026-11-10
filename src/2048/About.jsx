import { h } from 'hyperapp'
import About, { Link } from '../shell/About'

const TwentyAbout = ({ key, actions }) => (
  <About
    key={key}
    name="2048 Plus"
    actions={actions}
    credits={[
      <li>
        Rules, tile shapes and Classic's tile colours follow{' '}
        <Link href="https://github.com/gabrielecirulli/2048">2048</Link> by Gabriele Cirulli (MIT
        licence), itself inspired by 1024 and Threes; the code is written anew.
      </li>,
      <li>The tiles use the Clear Sans font by Intel (Apache 2.0 licence).</li>,
    ]}
  >
    <p>
      Slide the tiles: equal tiles that meet merge into one of twice the value. Make a 2048 tile, or
      keep going for the highest score you can.
    </p>
    <p>
      Boards of 3 × 3, 4 × 4 and 5 × 5, unlimited undo, and a hint that looks a short way ahead over
      the tiles that may appear and says why it likes a move. The best five scores per size are
      kept, apart for games that used help.
    </p>
  </About>
)

export default TwentyAbout
