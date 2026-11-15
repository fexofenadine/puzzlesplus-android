import { h } from 'hyperapp'
import { Rules } from '../lightup/HowToPlay'
import LightUpExample from './LightUpExample'
import { desktopSection } from './desktop'

//each example is a real position from a dealt board, where its technique was the easiest step
export const examples = {
  need: ['#..o3o.', '....o..', '.1..#..', '..o....', '.o3..0.', '..o....', '..#...0'],
  full: ['#..o3o.', '....o..', 'o1..#..', '..o....', '.o3..0.', '..o....', '..#...0'],
  boxed: ['#..o3o.', '....o..', 'o1..#..', '..o....', '.o3.x0x', '..o....', '..#..x0'],
  lone: ['#o2....', '.#...#.', 'o.#..o#', '1#..x2#', '#x.x1o.', 'x0x.x#o', '.x..#o2'],
  squeeze: ['#o2....', '.#o..#.', 'o.#...#', '1#...2#', '#xo.#o.', 'x0xox#o', 'ox.x1o2'],
  starve: ['..o....', 'o#x.#..', '.o3o#.x', '#3o4o#0', '.o#o#o.', 'o.#.o4o', '.....o.'],
  'what-if': ['.#o#.x.', '.x##2..', '2.2..x.', '.x.x.x.', '.x..#.2', '..2##x.', '.x.#o#.'],
}

export const solved = ['2o..#o.', 'o..1o..', '..#...#', '.0...0.', '#..o2.o', '..o3o..', '.o2..o#']

const Example = ({ technique }) => (
  <LightUpExample rows={examples[technique]} technique={technique} />
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
            A finished 7 × 7 board: every white cell lit, no bulb in another's light, and each
            number with that many bulbs beside it.
          </p>,
          <LightUpExample rows={solved} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels and sizes',
        body: () => [
          <p>
            Boards are made fresh for each game: walls scattered so the board looks the same turned
            half round, bulbs placed to light it, every wall numbered, then numbers taken away for
            as long as the chosen level can still finish it. Every board has exactly one solution,
            and a board is only dealt at a level if it really needs that level's reasoning.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: walls that need every free cell, walls that are full, and boxed in cells.
            </li>
            <li>
              <b>Medium</b> adds the only cell that can light another.
            </li>
            <li>
              <b>Hard</b> adds squeezes and starving. <b>Expert</b> adds a short what-if.
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
            bulb or cross that can't fit the only solution, and otherwise the easiest next bulb. The
            cells it reasons from are outlined in blue, what it places in green and shown faintly,
            and the reason is under the board with a More button that opens its section here. When
            the bulb leans on cells you haven't crossed out yet, the hint shows those crosses too
            and says why the first of them holds.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) turns bulbs that light each other red,
            and a number red once it has too many bulbs or too little room left for its own. When
            every cell is lit but the board isn't solved, the game asks whether you want a hint, or
            lets you find the mistake yourself. <b>Undo</b> (Ctrl+Z or the arrow button) takes back
            one change at a time.
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
        title: 'Walls that need every cell',
        body: () => [
          <p>
            Count the free cells beside a numbered wall: white, dark and not crossed out. When the
            wall needs as many bulbs as it has free cells, each of them holds one. A 4 always does,
            a 3 against the edge does, a 2 in a corner does.
          </p>,
          <Example technique="need" />,
        ],
      },
      {
        id: 'full',
        title: 'Full walls',
        body: () => [
          <p>
            Once a wall has its number of bulbs, no other cell beside it can hold one, so cross them
            out. A 0 is full from the start. The crosses matter: they are what later leaves a cell
            only one place it can be lit from.
          </p>,
          <Example technique="full" />,
        ],
      },
      {
        id: 'boxed',
        title: 'Boxed in cells',
        body: () => [
          <p>
            A dark cell has to be lit from somewhere along its row or column. When every other cell
            it can see is lit already or crossed out, nothing else can light it, so it holds a bulb
            itself. Cells closed in by walls on all sides are the plainest case.
          </p>,
          <Example technique="boxed" />,
        ],
      },
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      {
        id: 'lone',
        title: 'The only light',
        body: () => [
          <p>
            A crossed out cell that is still dark can't light itself. Look along its row and column
            for free cells: when just one is left, the bulb goes there. It is the same question as a
            boxed in cell, asked of a cell that can't answer it alone.
          </p>,
          <Example technique="lone" />,
        ],
      },
      {
        id: 'squeeze',
        title: 'Squeezes',
        body: () => [
          <p>
            A wall that still needs bulbs has to keep enough free cells beside it. A bulb elsewhere
            that would light too many of them, most often one diagonal to the wall, which lights two
            at once, can't be there. A 3 with four free cells crosses out all four diagonals, and so
            does a 1 with two free cells on either side of a corner.
          </p>,
          <Example technique="squeeze" />,
        ],
      },
      {
        id: 'starve',
        title: 'Starving a cell',
        body: () => [
          <p>
            The same idea for a dark cell: it needs at least one of the free cells it can see to
            stay free. A bulb that would light all of them without lighting the cell itself would
            leave it dark for good, so that bulb can't be there.
          </p>,
          <Example technique="starve" />,
        ],
      },
      {
        id: 'what-if',
        title: 'What-if',
        body: () => [
          <p>
            Expert boards sometimes stop every rule above. Then pick a free cell, suppose a bulb
            there (or suppose none) and follow the beginner rules from it. If a number soon can't be
            met or a cell can't be lit, the cell is the other way round. Cells beside numbers and in
            short corridors run into trouble soonest, so try those first.
          </p>,
          <Example technique="what-if" />,
        ],
      },
    ],
  },
]
