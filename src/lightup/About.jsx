import { h } from 'hyperapp'
import About from '../shell/About'

const LightUpAbout = ({ key, actions }) => (
  <About key={key} name="Light Up Plus" actions={actions}>
    <p>
      Put bulbs on the white cells until every one of them is lit. A bulb lights its row and column
      as far as the next wall, no bulb may light another, and a numbered wall has exactly that many
      bulbs in the cells beside it.
    </p>
    <p>
      Boards of 7 × 7, 10 × 10 and 14 × 14 in four levels, each with exactly one solution that logic
      alone finds, graded by the hardest technique it needs. Hints explain their reasoning and link
      to the guide.
    </p>
    <p>Light Up, also known as Akari, was first published by Nikoli.</p>
  </About>
)

export default LightUpAbout
