import { h } from 'hyperapp'
import About, { Link } from '../shell/About'

const TwentyAbout = ({ key, actions }) => (
  <About key={key} name="2048 Plus" actions={actions}>
    <p>
      Slide the tiles: equal tiles that meet merge into one of twice the value. Make a 2048 tile, or
      keep going for the highest score you can.
    </p>
    <p>
      Based on <Link href="https://github.com/gabrielecirulli/2048">2048</Link> by Gabriele Cirulli
      (MIT licence), itself inspired by 1024 and Threes, with the rules kept and the code written
      anew. The hint is a short look ahead over the tiles that may appear. Its tiles keep the
      original&apos;s shapes and, on Classic, its colours, with the Clear Sans font by Intel (Apache
      2.0 licence).
    </p>
    <p>
      Part of Puzzles Plus by fexofenadine, sharing its window, themes and backgrounds with
      Minesweeper Plus, which is based on{' '}
      <Link href="https://github.com/frenzzy/minesweeper">Minesweeper</Link> by Vladimir Kutepov.
    </p>
  </About>
)

export default TwentyAbout
