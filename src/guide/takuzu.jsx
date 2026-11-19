import { h } from 'hyperapp'
import { Rules } from '../takuzu/HowToPlay'
import TakuzuExample from './TakuzuExample'
import { desktopSection } from './desktop'

//each example is a real position from a dealt board, where its technique was the easiest step
export const examples = {
  pair: ['0.11.1', '1...0.', '.0...1', '..0..1', '.1....', '11.0.0'],
  gap: ['0.11.1', '1...0.', '.0...1', '..0..1', '.1....', '11.0.0'],
  count: ['...1..', '1101..', '0..0..', '10.101', '01.0..', '110...'],
  'one-left': ['001...', '110100', '001...', '10...1', '01....', '110...'],
  twins: ['001..1', '110100', '001011', '10..01', '01...0', '110..0'],
  balance: [
    '1.01010.',
    '..1...1.',
    '.....0..',
    '0....1.0',
    '..0..011',
    '..101001',
    '10110100',
    '..0...1.',
  ],
  repeat: ['110010', '001011', '...101', '...010', '0..101', '101100'],
  'what-if': [
    '.0..1...',
    '10..0...',
    '01101100',
    '010.....',
    '10010011',
    '0.10.1..',
    '...1..0.',
    '...0....',
  ],
}

const solved = ['001011', '101100', '010011', '001101', '110100', '110010']

const Example = ({ technique }) => (
  <TakuzuExample rows={examples[technique]} technique={technique} />
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
            A finished 6 × 6 board: no three alike in a row, three of each per line, no repeats.
          </p>,
          <TakuzuExample rows={solved} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels and sizes',
        body: () => [
          <p>
            Boards are made fresh for each game: a random full grid, then clues taken away for as
            long as the chosen level can still finish it. Every board has exactly one solution, and
            a board is only dealt at a level if it really needs that level's reasoning, the way
            puzzle collections such as Simon Tatham's Unruly grade them.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: pairs and gaps. <b>Medium</b> adds full counts.
            </li>
            <li>
              <b>Tricky</b> adds one left and twins. <b>Hard</b> adds balance and repeats.
            </li>
            <li>
              <b>Expert</b> adds a short what-if.
            </li>
          </ul>,
          <p>
            The Size menu has 6 × 6 to 14 × 14. 6 × 6 has no Expert. Big Expert boards are dealt in
            the background, so the window never stalls.
          </p>,
        ],
      },
      {
        id: 'mistakes',
        title: 'Hints, errors and mistakes',
        body: () => [
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) points out a broken rule first, then a
            cell that can't fit the only solution, and otherwise the easiest next step. The cells it
            reasons from are outlined in blue, the cell it fills in green, and the reason shows
            under the board with a More button that opens its section here.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) stripes cells that break a rule as you
            go. When every cell is filled but the board isn't solved, the game asks whether you want
            a hint, or lets you find the mistake yourself. <b>Undo</b> (Ctrl+Z or the arrow button)
            takes back one change at a time.
          </p>,
          <p>
            Each size and level keeps a best time, with and without hints. On Matrix,{' '}
            <b>Rain Glyphs</b> in the Display menu draws the two values as glyphs from the code
            rain.
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
        id: 'pair',
        title: 'Pairs',
        body: () => [
          <p>
            Two of the same digit side by side can't have a third beside them, so the cells at both
            ends of a pair take the other digit. Look along every row and column for pairs first;
            they are the most common step.
          </p>,
          <Example technique="pair" />,
        ],
      },
      {
        id: 'gap',
        title: 'Gaps',
        body: () => [
          <p>
            A single empty cell between two of the same digit would make three in a row, so it takes
            the other digit.
          </p>,
          <Example technique="gap" />,
        ],
      },
      {
        id: 'count',
        title: 'Full counts',
        body: () => [
          <p>
            Every line holds as many 0s as 1s, half its length each. Once a line has all of one
            digit, the rest of it is the other.
          </p>,
          <Example technique="count" />,
        ],
      },
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      {
        id: 'one-left',
        title: 'One left',
        body: () => [
          <p>
            When a line needs just one more of a digit, every other empty cell gets the other one.
            Try the last digit in each empty cell: wherever that would leave three alike in a row,
            it can't go, so that cell takes the other digit.
          </p>,
          <Example technique="one-left" />,
        ],
      },
      {
        id: 'twins',
        title: 'Twins',
        body: () => [
          <p>
            No two rows, and no two columns, may be the same. A line two cells short of matching a
            full one has to finish the other way round from it.
          </p>,
          <Example technique="twins" />,
        ],
      },
      {
        id: 'balance',
        title: 'Balance',
        body: () => [
          <p>
            Count how many of each digit a line still needs, then think through the ways to fit them
            in without three alike. Where every way agrees on a cell, that cell is settled. It helps
            most in lines with a few cells left and a known digit in the middle.
          </p>,
          <Example technique="balance" />,
        ],
      },
      {
        id: 'repeat',
        title: 'Repeats',
        body: () => [
          <p>
            Balance again, but leaving out any way to finish that would copy a full line. When that
            rules out all but one way, or all ways but those that agree on a cell, the cell is
            settled.
          </p>,
          <Example technique="repeat" />,
        ],
      },
      {
        id: 'what-if',
        title: 'What-if',
        body: () => [
          <p>
            Expert boards sometimes stop every line rule. Then pick a cell, suppose one digit and
            follow the simpler rules from it. If they soon break a rule, the cell must be the other
            digit. Lines with few empty cells left make the best places to try, since they run out
            of room quickly.
          </p>,
          <Example technique="what-if" />,
        ],
      },
    ],
  },
]
