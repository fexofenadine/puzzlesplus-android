import { h } from 'hyperapp'
import { Rules } from '../futoshiki/HowToPlay'
import FutoshikiExample from './FutoshikiExample'
import { desktopSection } from './desktop'

const blank = ['     ', '     ', '     ', '     ', '     ']

//each example is a real position from a dealt board, where its technique is what a hint
//reaches first; the first four are one board a few moves apart
const first = { right: [' < > ', ...blank.slice(1)], down: ['v    ', 'v   ^', ...blank.slice(2)] }

export const examples = {
  'naked-single': { rows: ['....4', '.3...', '.....', '..4..', '.....'], ...first },
  'hidden-single': { rows: ['3..54', '.3...', '.....', '..4..', '.....'], ...first },
  beside: { rows: ['....4', '.3...', '.....', '..4..', '.....'], ...first },
  ends: { rows: ['...54', '.3...', '.....', '..4..', '.....'], ...first },
  limits: {
    rows: ['31254', '23541', '1....', '...1.', '..1..'],
    right: [' < > ', ...blank.slice(1)],
    down: ['v    ', 'v   ^', '  ^  ', '     ', '     '],
  },
  'naked-pair': {
    rows: ['.....', '...3.', '3....', '4.51.', '.....'],
    right: ['     ', '     ', ' <   ', '     ', '     '],
    down: ['   v ', '     ', '^    ', 'vv   ', '     '],
  },
  'hidden-pair': {
    rows: ['43..5', '..4.3', '....1', '....2', '3...4'],
    right: ['     ', ' <   ', '     ', '     ', ' <   '],
    down: ['   ^ ', '     ', '   ^ ', '     ', '     '],
  },
  'what-if': {
    rows: ['52341', '4...5', '.54.2', '.4.53', '..5.4'],
    right: ['     ', '  <  ', '     ', ' >   ', '     '],
    down: ['   v ', '     ', '     ', '^    ', '     '],
  },
}

export const solved = {
  rows: ['31254', '23541', '14325', '52413', '45132'],
  right: [' < > ', ...blank.slice(1)],
  down: ['v    ', 'v   ^', '  ^  ', '     ', '     '],
}

const Example = ({ technique }) => (
  <FutoshikiExample example={examples[technique]} technique={technique} />
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
          <p>A finished 5 × 5 board: 1 to 5 once in every row and column, and every sign true.</p>,
          <FutoshikiExample example={solved} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels and sizes',
        body: () => [
          <p>
            Boards are made fresh for each game: a random full grid with every sign, then digits and
            signs taken away for as long as the chosen level can still finish it. Every board has
            exactly one solution, and a board is only dealt at a level if it really needs that
            level's reasoning.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: singles, signs beside a placed digit, and the ends of chains of signs.
            </li>
            <li>
              <b>Medium</b> adds limits between two empty cells.
            </li>
            <li>
              <b>Hard</b> adds naked and hidden pairs. <b>Expert</b> adds a short what-if.
            </li>
          </ul>,
          <p>
            The Size menu has 4 × 4 to 7 × 7. A 4 × 4 board that needs pairs is too rare to deal, so
            it has no Hard.
          </p>,
        ],
      },
      {
        id: 'mistakes',
        title: 'Notes, hints and mistakes',
        body: () => [
          <p>
            <b>Notes</b> are small candidate digits. Turn Notes on at the pad (or press Space), hold
            Shift while typing, or right click a cell with a digit picked. <b>Auto Notes</b> fills
            in what each cell's row and column allow, and <b>Tidy Notes</b> takes a digit out of the
            notes in its row and column as you place it. The signs are yours to apply: the
            techniques below are how they trim the notes.
          </p>,
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) points out a broken rule first, then a
            digit that can't fit the only solution, and otherwise the next digit. When that digit
            only shows once candidates have been taken away, the hint explains the removal that
            opened it up and then the digit. The cells it reasons from are outlined in blue, the
            digit it places in green, and the More button opens the technique's section here.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) marks digits that repeat in a line and
            pairs the wrong way round for their sign. When every cell is filled but the board isn't
            solved, the game asks whether you want a hint. <b>Undo</b> (Ctrl+Z or the arrow button)
            takes back one change, notes included, and Ctrl+Y redoes it.
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
        id: 'naked-single',
        title: 'Naked singles',
        body: () => [
          <p>
            Cross off every digit already in a cell's row and column, and every digit the signs
            around it rule out. When one digit is left, the cell holds it.
          </p>,
          <Example technique="naked-single" />,
        ],
      },
      {
        id: 'hidden-single',
        title: 'Hidden singles',
        body: () => [
          <p>
            Take one digit and one line. Every cell of the line that already sees that digit in its
            own column or row, or can't hold it for a sign, is out. When one cell is left, the digit
            goes there, whatever else that cell could have been.
          </p>,
          <Example technique="hidden-single" />,
        ],
      },
      {
        id: 'beside',
        title: 'Beside a digit',
        body: () => [
          <p>
            A sign next to a placed digit is a plain limit: the cell on the small side is less than
            that digit, the cell on the large side greater. Beside a 2 on its large side only a 1
            fits.
          </p>,
          <Example technique="beside" />,
        ],
      },
      {
        id: 'ends',
        title: 'Ends of chains',
        body: () => [
          <p>
            A cell that is greater than another can't be 1, and one that is less than another can't
            be the largest digit. Signs that follow on from each other count up: the cell at the top
            of a chain of three signs is at least 4, the one at the bottom at most the largest digit
            less three.
          </p>,
          <Example technique="ends" />,
        ],
      },
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      {
        id: 'limits',
        title: 'Limits',
        body: () => [
          <p>
            The same sign works between two empty cells, through their candidates. The small cell
            has to stay below the largest digit the big cell can still be, and the big cell above
            the smallest the small cell can be. Each trim can set off the next along a chain.
          </p>,
          <Example technique="limits" />,
        ],
      },
      {
        id: 'naked-pair',
        title: 'Naked pairs',
        body: () => [
          <p>
            Two cells of a line that can each only be the same two digits will take those two
            between them, in one order or the other. No other cell of the line can hold either.
          </p>,
          <Example technique="naked-pair" />,
        ],
      },
      {
        id: 'hidden-pair',
        title: 'Hidden pairs',
        body: () => [
          <p>
            Two digits that can each only go in the same two cells of a line fill those cells, so
            every other candidate there goes.
          </p>,
          <Example technique="hidden-pair" />,
        ],
      },
      {
        id: 'what-if',
        title: 'What-if',
        body: () => [
          <p>
            Expert boards sometimes stop every rule above. Then pick a cell with two candidates,
            suppose one and follow the simpler rules from it. If a cell soon has no digit left, or a
            line no place for one, the cell isn't that digit.
          </p>,
          <Example technique="what-if" />,
        ],
      },
    ],
  },
]
