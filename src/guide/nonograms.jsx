import { h } from 'hyperapp'
import { Rules } from '../nonograms/HowToPlay'
import { BoardExample, LineExample } from './NonogramsExample'
import { desktopSection } from './desktop'

//single rows show the line techniques, # filled, x crossed out, . empty
export const lines = {
  complete: { clue: [3, 3, 2], values: '..........' },
  overlap: { clue: [7], values: '..........' },
  gap: { clue: [3], values: 'x..x......' },
  forcing: { clue: [1, 4], values: '........#.' },
  reach: { clue: [1, 2], values: '.......#..' },
  line: { clue: [1, 1], values: '..#.x.....' },
}

//a real position from an expert board where only what-if goes on
export const whatIf = {
  clues: [
    [1, 1],
    [3, 3],
    [9],
    [6],
    [4],
    [2],
    [],
    [],
    [6],
    [1, 1],
    [2],
    [3],
    [3, 1],
    [3, 2],
    [4, 1],
    [4, 1],
    [3, 2],
    [3, 1],
    [3],
    [1],
  ],
  rows: [
    'x..xxxx..x',
    '###xxxx###',
    '#########x',
    'x..####..x',
    'xxx####xxx',
    'xxxx##xxxx',
    'xxxxxxxxxx',
    'xxxxxxxxxx',
    'xx######xx',
    'xxx#xx#xxx',
  ],
}

const picture = ['#####', '##.##', '##.##', '.#.#.', '#####']

const Line = ({ technique }) => <LineExample {...lines[technique]} technique={technique} />

export const parts = [
  {
    title: 'How to Play',
    sections: [
      {
        id: 'rules',
        title: 'The rules',
        body: () => [
          <Rules />,
          <p>A finished 5 × 5 picture, every clue dimmed because its line matches:</p>,
          <BoardExample rows={picture} />,
        ],
      },
      {
        id: 'levels',
        title: 'Levels and sizes',
        body: () => [
          <p>
            Pictures are random blobs made fresh for each game, sometimes mirrored. A picture that
            logic can't finish is touched up cell by cell until it can, so every board has exactly
            one solution and needs no guessing. A board is only dealt at a level if it needs that
            level's reasoning.
          </p>,
          <ul>
            <li>
              <b>Easy</b>: lines a clue settles alone, overlaps and gaps, counting only crossed out
              cells.
            </li>
            <li>
              <b>Medium</b>: the same overlaps and reach with filled cells counted too.
            </li>
            <li>
              <b>Hard</b>: everything one line proves when every way of fitting its clue is tried.
            </li>
            <li>
              <b>Expert</b>: adds what-if across lines.
            </li>
          </ul>,
          <p>
            The Size menu has 5 × 5 to 25 × 25, with a thicker line every five cells. 5 × 5 has no
            Expert, since boards that small never need it.
          </p>,
        ],
      },
      {
        id: 'mistakes',
        title: 'Hints, errors and mistakes',
        body: () => [
          <p>
            <b>Hint</b> (H, the Game menu or the ? button) points out a clue that can't be matched
            any more first, then a cell that can't fit the only solution, and otherwise the easiest
            next step. Its clue and the cells it reasons from are outlined in blue, the cells it
            settles show faintly in green, and a More button under the board opens its section here.
          </p>,
          <p>
            <b>Show Errors</b> (Game menu, off by default) turns a clue red once its line can't
            match. When every fill is placed but the picture is wrong, the game asks whether you
            want a hint. <b>Undo</b> (Ctrl+Z) takes back a whole drag at a time.
          </p>,
          <p>
            Each size and level keeps a best time, with and without hints. On Matrix,{' '}
            <b>Rain Glyphs</b> in the Display menu draws filled cells as a glyph from the code rain.
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
        id: 'complete',
        title: 'Lines a clue settles alone',
        body: () => [
          <p>
            Some clues need no thought. A clue of 0 means the whole line is empty. A clue whose
            runs, with one empty cell between each, add up to the line's length fills it exactly.
            And a line that already shows all its runs has nothing else to fill.
          </p>,
          <Line technique="complete" />,
        ],
      },
      {
        id: 'overlap',
        title: 'Overlaps',
        body: () => [
          <p>
            Push a run as far left as it can go, then as far right. The cells it covers both times
            are filled wherever it really sits. A run longer than half the line always overlaps
            itself, and with several runs, push them all together.
          </p>,
          <Line technique="overlap" />,
        ],
      },
      {
        id: 'gap',
        title: 'Gaps',
        body: () => [
          <p>
            Crossed out cells split a line into pieces. A piece too short for any run that could
            reach it stays empty, and so does any cell beyond the furthest any run can be pushed.
          </p>,
          <Line technique="gap" />,
        ],
      },
      {
        id: 'forcing',
        title: 'Forcing with filled cells',
        body: () => [
          <p>
            Filled cells pin runs down. A run must cover each filled cell, so pushing runs as far as
            they go while keeping every filled cell covered gives tighter overlaps than the empty
            line does.
          </p>,
          <Line technique="forcing" />,
        ],
      },
      {
        id: 'reach',
        title: 'Reach',
        body: () => [
          <p>
            The same pushing shows how far each run can reach once filled cells pin it. Cells no run
            can reach any more are empty, which often clears the ends of a line.
          </p>,
          <Line technique="reach" />,
        ],
      },
    ],
  },
  {
    title: 'Advanced techniques',
    sections: [
      {
        id: 'line',
        title: 'Every way a line fits',
        body: () => [
          <p>
            When the quick rules stop, take one line and think through every way its clue can sit
            around the cells already known. Any cell that comes out the same in all of them is
            settled. This finds everything one line can prove on its own.
          </p>,
          <Line technique="line" />,
        ],
      },
      {
        id: 'what-if',
        title: 'What-if',
        body: () => [
          <p>
            Expert boards stop even full line logic. Then suppose a cell is filled, or empty, and
            follow the lines from it. If some line ends up unable to match its clue, the cell must
            be the other way. Cells beside long clues make good places to try.
          </p>,
          <BoardExample {...whatIf} technique="what-if" />,
        ],
      },
    ],
  },
]
