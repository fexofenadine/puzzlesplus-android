import { h } from 'hyperapp'
import Button from '../Button'

//windows 95's maximise and restore glyphs
const MAXIMISE = 'M2 1h9v9H2zM3 3v6h7V3z'
const RESTORE = 'M2 4h6v6H2zM3 6v3h4V6zM4 1h6v6H8V6h1V3H5v1H4z'

//title bar pause, minimise and maximise, the dialog adds close
//original is windows 95's minesweeper: no pause, maximise greyed out
const WindowControls = ({
  paused,
  canPause,
  onPause,
  maximised,
  onMinimise,
  onMaximise,
  original,
}) => [
  !original && (
    <Button
      tabIndex={-1}
      title={paused ? 'Resume (P)' : 'Pause (P)'}
      disabled={!canPause}
      onClick={() => onPause()}
    >
      <svg width="13" height="11">
        <path d={paused ? 'M4 1.5v8l6-4z' : 'M4 2h2v7H4zM8 2h2v7H8z'} />
      </svg>
    </Button>
  ),
  <Button tabIndex={-1} title="Minimise" onClick={() => onMinimise()}>
    <svg width="13" height="11">
      <path d="M3 8h6v2H3z" />
    </svg>
  </Button>,
  <Button
    tabIndex={-1}
    title={original ? null : maximised ? 'Restore' : 'Maximise'}
    disabled={original}
    onClick={() => onMaximise()}
  >
    <svg width="13" height="11">
      <path fill-rule="evenodd" d={maximised ? RESTORE : MAXIMISE} />
    </svg>
  </Button>,
]

//the props every game window passes, from the shell state and actions
export const windowProps = (state, actions, paused, canPause) => ({
  paused,
  canPause,
  onPause: actions.pause,
  maximised: state.zoom.maximised,
  onMinimise: actions.minimise,
  onMaximise: actions.maximise,
})

export default WindowControls
