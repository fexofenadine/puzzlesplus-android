import { h } from 'hyperapp'
import { Rules as MinesweeperRules } from '../HowToPlay'
import { Rules as TakuzuRules } from '../takuzu/HowToPlay'
import { Rules as NonogramsRules } from '../nonograms/HowToPlay'
import { Rules as SudokuRules } from '../sudoku/HowToPlay'
import { Rules as TwentyRules } from '../2048/HowToPlay'
import { Page } from './Guide'

//the short rules of every game on one page, each with its game and full guide
const game = (id, title, Rules) => ({
  id,
  title,
  body: () => [
    <Rules />,
    <p>
      <Page href={`../${id}/`}>Play {title}</Page> ·{' '}
      <Page href={`../${id}/guide/`}>{title} guide</Page> with every solving technique
    </p>,
  ],
})

export const parts = [
  {
    title: 'How to Play',
    sections: [
      game('minesweeper', 'Minesweeper', MinesweeperRules),
      game('takuzu', 'Takuzu', TakuzuRules),
      game('nonograms', 'Nonograms', NonogramsRules),
      game('sudoku', 'Sudoku', SudokuRules),
      game('2048', '2048', TwentyRules),
      {
        id: 'shortcuts',
        title: 'Every game',
        body: () => (
          <p>
            F2 or N starts a new game, H gives a hint, P pauses, + and - zoom, and Esc hides the
            game behind a spreadsheet. The taskbar's Start button opens any game and its guide.
          </p>
        ),
      },
    ],
  },
]
