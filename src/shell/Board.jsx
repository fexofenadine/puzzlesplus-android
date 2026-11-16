import { h } from 'hyperapp'
import s from './Board.module.css'
import Button from '../Button'
import { hangBelow } from './zoom'
import { showScreensaver } from './screensaver'

//the play button over a paused board, and one that shows only the background
export const PausedCover = ({ onResume }) => (
  <div class={s.paused}>
    <Button tabIndex={-1} title="Resume (P)" onClick={() => onResume()}>
      <svg width="40" height="40">
        <path d="M14 9v22l17-11z" />
      </svg>
    </Button>
    <Button tabIndex={-1} title="Show only the background" onClick={() => showScreensaver()}>
      <svg width="40" height="40">
        <path
          d="M8 11h24v18H8zm2 2v12l6-6 4 4 3-3 7 7V13zm15 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
          fill-rule="evenodd"
        />
      </svg>
    </Button>
  </div>
)

//the explanation under the board, hanging below the window's place so the board never moves
//more links to the guide's section on it, in a new tab so the game stays
export const HintPanel = ({ text, more }) => (
  <p class={s.hint} role="status" {...hangBelow}>
    {more && (
      <a class={s.more} href={more} target="_blank" rel="noopener" title="Read more in the guide">
        More
      </a>
    )}
    {text}
  </p>
)
