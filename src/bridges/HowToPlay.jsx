import { h } from 'hyperapp'
import HowToPlay from '../shell/HowToPlay'

//the rules in short, for the dialog and the guide pages
export const Rules = () => [
  <p>
    Join the islands with bridges. The number on an island is how many bridges it has. Bridges run
    in straight lines between two islands, a pair takes one or two, and no bridge may cross another
    or an island. When you are done every island must be reachable from every other.
  </p>,
  <p>
    Click an island, then another island in line with it, to build a bridge between them: again for
    a second one and again to take them away. Dragging from one island to the other does the same,
    and so does clicking the water between them. Right click steps back. On a keyboard the arrow
    keys move a cursor from island to island and Shift with an arrow builds a bridge that way.
  </p>,
  <p>
    The left counter shows the islands still without their number, Ctrl+Z undoes and Ctrl+Y redoes.
    An island with all its bridges dims. With Count Down Numbers on (Game menu), an island shows the
    bridges it still needs instead of its number, and turns red below 0. Show Errors marks islands
    with too many bridges or no way left to reach their number, bridges that cross, and groups that
    are complete but cut off, and Hint explains the next step logic gives. Every board has one
    solution that needs no guessing.
  </p>,
]

const BridgesHowToPlay = ({ key, actions }) => (
  <HowToPlay key={key} name="Bridges" actions={actions}>
    <Rules />
  </HowToPlay>
)

export default BridgesHowToPlay
