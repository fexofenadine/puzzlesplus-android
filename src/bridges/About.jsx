import { h } from 'hyperapp'
import About from '../shell/About'

const BridgesAbout = ({ key, actions }) => (
  <About key={key} name="Bridges Plus" actions={actions}>
    <p>
      Join the islands with bridges. Each island's number is how many bridges it has, a pair of
      islands takes one or two, bridges run straight and never cross, and every island must be
      reachable from every other.
    </p>
    <p>
      Boards of 7 × 7, 10 × 10 and 14 × 14 in four levels, each with exactly one solution that logic
      alone finds, graded by the hardest technique it needs. Hints explain their reasoning and link
      to the guide.
    </p>
    <p>Bridges, also known as Hashi or Hashiwokakero, was first published by Nikoli.</p>
  </About>
)

export default BridgesAbout
