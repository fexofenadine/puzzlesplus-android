import { h } from 'hyperapp'
import { Rules } from '../bridges/HowToPlay'
import BridgesExample from './BridgesExample'
import { desktopSection } from './desktop'

//each example is a real position from a dealt board, the bridges drawn so far in the water:
//- and = for one and two across, | and : for one and two down
export const examples = {
  need: ['..2.5.2', '.3.1...', '.......', '......3', '.5..4..', '.......', '.2....3'],
  full: ['.2....2', '1.2--3.', '|....|.', '|2...2.', '|......', '3=3...2', '.......'],
  crossed: ['2.2..1.', '.......', '3--2.1.', '.......', '3---1..', '|......', '2.1....'],
  limit: ['1.3--3.', '.....|.', '2..1.3.', '.......', '..2..4.', '.....|.', '2----3.'],
  isolate: ['.......', '3---3.1', '|......', '|......', '3..1..2', '......|', '2.2.4-3'],
  exit: ['3-4.4-3', '|.|.|.|', '|.|.|.3', '3.|.|.|', '|.|.3-4', '3-4--1|', '.1----2'],
  'what-if': ['2.3.2..', '.......', '..1....', '4...4..', '|.2.|..', '|.|.|..', '3-3.2..'],
}

export const solved = ['.4===3.', '.:...|.', '.4--3|.', '.|..:|.', '.|2=5|.', '.|..|1.', '.2--3-1']

const Example = ({ technique }) => (
  <BridgesExample rows={examples[technique]} technique={technique} />
)

export const parts = [
  {
    title: 'How to Play',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: () => [
          <Rules />,
          <p>
            A finished 7 × 7 board: every island has its number of bridges, none cross, and all the
            islands are joined into one.
          </p>,
          <BridgesExample rows={solved} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels and sizes',
        body: () => [
          <p>
            Boards are made fresh for each game: islands grown from one by bridges, a few more
            bridges added between neighbours, then every island numbered by the bridges it ended up
            with. Every board has exactly one solution, and a board is only dealt at a level if it
            really needs that level's reasoning.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: islands whose neighbours can't give them their bridges between them,
              islands that are full, and bridges that would cross.
            </li>
            <li>
              <b>Medium</b> adds islands with only so many bridges left to place.
            </li>
            <li>
              <b>Hard</b> adds groups that would be cut off and groups with one way out.{' '}
              <b>Expert</b> adds a short what-if.
            </li>
          </ul>,
          <p>The Size menu has 7 × 7, 10 × 10 and 14 × 14, each at every level.</p>,
        ],
      },
      {
        id: 'mistakes',
        title: 'Hints, errors and mistakes',
        body: () => [
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) points out a broken rule first, then a
            link with more bridges than the only solution gives it, and otherwise the easiest next
            bridge. The islands it reasons from are outlined in blue, the bridge it places is drawn
            faintly in green, and the reason is under the board with a More button that opens its
            section here. When the bridge leans on links that can't hold one, the hint marks those
            with a small cross and says why the first of them holds none.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) turns an island red when it has too many
            bridges or no way left to reach its number, and the islands of a finished group that is
            cut off from the rest. When every island has its number but the puzzle isn't solved, the
            game asks whether you want a hint, or lets you find the mistake yourself. <b>Undo</b>{' '}
            (Ctrl+Z or the arrow button) takes back one change at a time.
          </p>,
          <p>
            Each size and level keeps a best time, with and without hints, and the Game menu has a
            Daily Puzzle and Copy Link, which gives the board in play as a link.
          </p>,
        ],
      },
      desktopSection,
    ],
  },
  {
    title: 'Beginner techniques',
    sections: [
      {
        id: 'need',
        title: 'Islands that need every neighbour',
        body: () => [
          <p>
            Add up the most bridges an island's neighbours can take. When that is only just enough,
            or so few that something must go to each, those bridges are certain. A 1 beside a lone
            neighbour, a 4 in a corner, a 6 on an edge and an 8 anywhere have no choice at all, and
            a 3 in a corner with two neighbours needs at least one bridge to each.
          </p>,
          <Example technique="need" />,
        ],
      },
      {
        id: 'full',
        title: 'Full islands',
        body: () => [
          <p>
            Once an island has its number of bridges, no other bridge can reach it. Every link that
            is still open to it is closed, which often leaves its neighbours with fewer places to
            go.
          </p>,
          <Example technique="full" />,
        ],
      },
      {
        id: 'crossed',
        title: 'Crossing bridges',
        body: () => [
          <p>
            Bridges never cross. A link with a bridge already across it has none, so it can be ruled
            out, and the islands at its ends have one place fewer to turn to.
          </p>,
          <Example technique="crossed" />,
        ],
      },
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      {
        id: 'limit',
        title: 'Only so many left',
        body: () => [
          <p>
            An island that still has one bridge to place can take no double bridge anywhere, and one
            with two to place can't give three. Cap each link by what its islands have left, and a
            link capped at one often cannot take a second bridge from either end.
          </p>,
          <Example technique="limit" />,
        ],
      },
      {
        id: 'isolate',
        title: 'Cut off groups',
        body: () => [
          <p>
            Every island has to be reachable from every other. When another bridge on a link would
            give a group of islands all their bridges while the rest of the puzzle stays outside,
            that bridge can't go there. Two 1s side by side, or a pair of 2s joined twice, are the
            plainest cases.
          </p>,
          <Example technique="isolate" />,
        ],
      },
      {
        id: 'exit',
        title: 'One way out',
        body: () => [
          <p>
            Look at a group of islands joined so far. When only one link could still lead out of it,
            a bridge must go there, or the group stays cut off for good.
          </p>,
          <Example technique="exit" />,
        ],
      },
      {
        id: 'what-if',
        title: 'What-if',
        body: () => [
          <p>
            Expert boards sometimes stop every rule above. Then pick a link, suppose it holds a
            certain number of bridges and follow the beginner rules from it. If an island soon can't
            be met or a group is cut off, the link holds something else. Links between islands with
            small numbers run into trouble soonest, so try those first.
          </p>,
          <Example technique="what-if" />,
        ],
      },
    ],
  },
]
