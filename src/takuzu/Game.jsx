import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './Game.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import SideButton, { HintIcon, UndoIcon } from '../shell/SideButton'
import WindowControls, { windowProps } from '../shell/WindowControls'
import { PausedCover, HintPanel } from '../shell/Board'
import { guideTopic } from './hint'
import { watchWindow } from '../shell/zoom'
import { pageUrl, phone } from '../shell/phone'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'
import Cell from './Cell'
import { EMPTY, violations } from './rules'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, board, givens, paused } = game
  const errors = state.errors && !paused ? violations(board, n) : null
  const marks = (!paused && hint && hint.marks) || {}
  const left = board.filter((v) => v === EMPTY).length
  return (
    <Dialog
      key={key}
      hidden={state.windowState !== 'open'}
      title={!phone && (state.theme === 'classic' ? 'Takuzu' : 'Takuzu Plus')}
      titleHint="Double-click for 100% zoom"
      onTitleDoubleClick={() => actions.zoom(0)}
      controls={<WindowControls {...windowProps(state, actions, paused, running(game))} />}
      onClose={actions.close}
      onCreate={(dialog) => {
        watchWindow(dialog, actions.fit)
        actions.fit()
      }}
    >
      {!phone && <Menu state={state} actions={actions} />}
      <div class={g.root}>
        <div class={g.scoreboard}>
          <Digit value={game.dealing ? 0 : left} />
          <div class={g.buttons}>
            <SideButton
              title="Undo (Ctrl+Z)"
              disabled={!game.history.length || game.win || paused}
              onClick={actions.undo}
            >
              <UndoIcon />
            </SideButton>
            <Play pressed={false} lose={false} win={game.win} onReset={actions.reset} />
            <SideButton
              title="Hint (H)"
              disabled={game.dealing || game.win || paused}
              onClick={actions.hint}
            >
              <HintIcon />
            </SideButton>
          </div>
          <Digit value={game.time} digits={clockDigits(state.theme, game.time)} />
        </div>
        <div class={running(game) && !paused ? s.active : s.inactive} style={{ '--n': n }}>
          {[...board].map((value, i) => (
            <Cell
              i={i}
              value={paused ? EMPTY : value}
              given={!paused && givens[i] !== EMPTY}
              error={errors && errors.has(i)}
              mark={marks[i]}
              onPress={actions.play}
            />
          ))}
          {paused && <PausedCover onResume={() => actions.pause(false)} />}
        </div>
        {hint && !paused && <HintPanel text={hint.text} more={more(hint)} />}
      </div>
    </Dialog>
  )
}

export default Game
