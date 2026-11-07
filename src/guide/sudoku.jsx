import { h } from 'hyperapp'
import { Rules } from '../sudoku/HowToPlay'
import SudokuExample from './SudokuExample'
import { desktopSection } from './desktop'

//each example is a real position from a dealt board, where its technique was the easiest step
//removed lists candidates earlier steps had already taken away
export const examples = {
  'hidden-single': {
    rows: [
      '.......9.',
      '7...4...6',
      '8...51.3.',
      '..5...8.7',
      '...5.3...',
      '9.4...2..',
      '.4.38...5',
      '3...2...9',
      '.7.......',
    ],
  },
  'naked-single': {
    rows: [
      '...52.8.7',
      '.3..6..2.',
      '..21..5.6',
      '9....24..',
      '.........',
      '..69....3',
      '3.8..67..',
      '.7..9..58',
      '2.4..8...',
    ],
  },
  pointing: {
    rows: [
      '.8.624.91',
      '1.68.9423',
      '24913.68.',
      '912..6378',
      '867293154',
      '4..718962',
      '.91.82.46',
      '6.8...219',
      '.2496183.',
    ],
  },
  claiming: {
    rows: [
      '72.......',
      '3.94.5.7.',
      '..5.1....',
      '9731468..',
      '468592713',
      '.5.873.9.',
      '....3.5..',
      '.976.4231',
      '.3.....87',
    ],
  },
  'naked-pair': {
    rows: [
      '5..1.879.',
      '..15..2.8',
      '7...4.513',
      '.32...85.',
      '47.2.5931',
      '.59....2.',
      '21..9...5',
      '..5...1.9',
      '967451382',
    ],
  },
  'hidden-pair': {
    rows: [
      '..1857.9.',
      '.763.9.58',
      '9..2.6.7.',
      '.92485..7',
      '7.49.1825',
      '5..7.29..',
      '..9573.82',
      '8.7.24539',
      '....987..',
    ],
  },
  'naked-triple': {
    rows: [
      '7.6...125',
      '951267483',
      '23..5.769',
      '.1243.697',
      '..76..312',
      '369712548',
      '12354..76',
      '.9..762.1',
      '67..2...4',
    ],
    removed: [[63, '5']],
  },
  'hidden-triple': {
    rows: [
      '.9..463..',
      '6.79..5.4',
      '..47.5269',
      '.123.945.',
      '.4.....9.',
      '9.685412.',
      '4596.38..',
      '.6.4..935',
      '..359..4.',
    ],
    removed: [[8, '8']],
  },
  'x-wing': {
    rows: [
      '139285674',
      '746391852',
      '825764931',
      '51.8..7.6',
      '6.......3',
      '39...6.28',
      '25.6.8419',
      '9..14.265',
      '461952387',
    ],
  },
  'xy-wing': {
    rows: [
      '.498.2376',
      '.7...6.25',
      '26..7..81',
      '956127834',
      '487...612',
      '321684759',
      '.3.961.47',
      '61.748.93',
      '794235168',
    ],
  },
  swordfish: {
    rows: [
      '8.53..4.1',
      '1.2.8.357',
      '3...158.6',
      '6235..918',
      '..1823645',
      '584169732',
      '436751289',
      '.18.3.5.4',
      '.5...81.3',
    ],
    removed: [[1, '7']],
  },
  'xyz-wing': {
    rows: [
      '.3...95..',
      '689524371',
      '....1....',
      '84...12..',
      '9132.64.7',
      '.62....13',
      '.98.6....',
      '47.89..3.',
      '..61...9.',
    ],
  },
  'what-if': {
    rows: [
      '139285674',
      '...391852',
      '825764931',
      '51.8..7.6',
      '........3',
      '39...6.28',
      '.5.6.8419',
      '9..14.265',
      '461952387',
    ],
  },
}

const solved = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
]

const Example = ({ technique }) => <SudokuExample {...examples[technique]} technique={technique} />

//a technique's section: its explanation, then its example with the hint's words
const technique = (id, title, text) => ({
  id,
  title,
  body: () => [<p>{text}</p>, <Example technique={id} />],
})

export const parts = [
  {
    title: 'How to Play',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: () => [
          <Rules />,
          <p>A finished board: every row, column and box holds 1 to 9 once each.</p>,
          <SudokuExample rows={solved} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels',
        body: () => [
          <p>
            Boards are made fresh for each game: a random full grid, then clues taken away in pairs
            turned half way round the centre, for as long as the chosen level can still finish the
            board. Every board has exactly one solution, and a board is only dealt at a level if it
            really needs that level's reasoning.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: hidden and naked singles, with at least 36 clues.
            </li>
            <li>
              <b>Medium</b> adds pointing, claiming and pairs.
            </li>
            <li>
              <b>Hard</b> adds triples and quads, the X-Wing and the XY-Wing.
            </li>
            <li>
              <b>Expert</b> adds the Swordfish, the XYZ-Wing and a short what-if.
            </li>
          </ul>,
        ],
      },
      {
        id: 'mistakes',
        title: 'Notes, hints and mistakes',
        body: () => [
          <p>
            <b>Notes</b> are the small digits a cell might still hold, its candidates. From Medium
            on, most steps work by crossing candidates off until a cell or a digit has one choice
            left, so notes are worth keeping. <b>Auto Notes</b> (Game menu) writes every candidate
            in for you, and <b>Tidy Notes</b> (on by default) takes a digit out of the notes it
            rules out as soon as you place it.
          </p>,
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) points out a repeated digit first, then a
            digit that can't fit the only solution, then notes that leave out the digit a cell
            needs, and otherwise the next digit logic gives. The cells it reasons from are outlined
            in blue, candidates it takes away in amber and the cell it fills in green, and the
            reason shows under the board with a More button that opens its section here. When a
            removal has to come first, the hint explains it and the digit it opens up.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) stripes digits that repeat in a row,
            column or box. When every cell is filled but the board isn't solved, the game asks
            whether you want a hint. <b>Undo</b> (Ctrl+Z or the arrow button) takes back one change
            at a time, a digit together with the notes it tidied. Each level keeps a best time, with
            and without hints.
          </p>,
        ],
      },
      desktopSection,
    ],
  },
  {
    title: 'Beginner techniques',
    sections: [
      technique(
        'hidden-single',
        'Hidden singles',
        'Pick a digit and a box, row or column without it. When every other empty cell there is ruled out, because the digit is already in its row, column or box, the digit goes in the one cell left. Boxes are the best place to start.',
      ),
      technique(
        'naked-single',
        'Naked singles',
        'Look at one empty cell and the digits in its row, column and box. When eight different digits are in sight, the ninth is the only one the cell can hold.',
      ),
    ],
  },
  {
    title: 'Intermediate techniques',
    sections: [
      technique(
        'pointing',
        'Pointing',
        "When a digit's candidates in a box all sit in one row or column, the digit must go in that line inside the box, so it can't go anywhere else along the line.",
      ),
      technique(
        'claiming',
        'Claiming',
        "The other way round: when a digit's candidates in a row or column all sit in one box, the digit goes in that box on that line, so the box's other cells lose it.",
      ),
      technique(
        'naked-pair',
        'Naked pairs',
        'Two cells in a unit with the same two candidates and nothing else take those two digits between them, in some order. No other cell in that unit can hold either one.',
      ),
      technique(
        'hidden-pair',
        'Hidden pairs',
        'Two digits that can only go in the same two cells of a unit fill those cells between them, so any other candidates in the two cells can go.',
      ),
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      technique(
        'naked-triple',
        'Naked triples and quads',
        "Three cells of a unit whose candidates come from just three digits hold those three digits between them, so the unit's other cells lose them. Each cell needn't have all three. Four cells with four digits work the same way.",
      ),
      technique(
        'hidden-triple',
        'Hidden triples and quads',
        'Three digits that only fit in the same three cells of a unit take those cells, so the cells lose every other candidate. Four digits in four cells work the same way.',
      ),
      technique(
        'x-wing',
        'X-Wing',
        'Find a digit with exactly two places in each of two rows, and those places in the same two columns. The digit goes in one corner of the rectangle in each row, so between them they fill both columns, and the digit can go nowhere else in those columns. It works with rows and columns swapped too.',
      ),
      technique(
        'xy-wing',
        'XY-Wing',
        'A cell with two candidates, X or Y, sees one cell with X or Z and another with Y or Z. Whatever the middle cell turns out to be, one of the outer cells becomes Z, so any cell that sees both outer cells can lose Z.',
      ),
      technique(
        'swordfish',
        'Swordfish and Jellyfish',
        'The X-Wing with three lines: a digit whose places in three rows all fall in the same three columns fills those columns from these rows, so it can go nowhere else in them. Four lines make a Jellyfish.',
      ),
      technique(
        'xyz-wing',
        'XYZ-Wing',
        'Like the XY-Wing, but the middle cell has Z as a third candidate. One of the three cells must be Z, so only cells that see all three lose it.',
      ),
      technique(
        'what-if',
        'What-if',
        'When nothing else works, pick a cell with few candidates and suppose one of them. Follow the singles from there. If they soon leave a cell with no candidates, or a digit with no place in some unit, the supposed digit was wrong and comes out of the notes.',
      ),
    ],
  },
]
