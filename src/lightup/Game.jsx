import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './LightUp.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import SideButton, { HintIcon, PauseButton, UndoIcon } from '../shell/SideButton'
import WindowControls, { windowProps } from '../shell/WindowControls'
import { PausedCover, HintPanel } from '../shell/Board'
import { guideTopic } from './hint'
import { watchWindow } from '../shell/zoom'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'
import Cell from './Cell'
import { BLANK, BULB, EMPTY, WHITE, besideOf, darkLeft, litOf, violations } from './rules'
import { windowClear } from '../shell/actions'
import { pageUrl, phone } from '../shell/phone'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, layout, board, paused } = game
  const hidden = paused || game.dealing
  const errors = state.errors && !hidden ? violations(layout, board, n) : null
  const marks = (!paused && hint && hint.marks) || {}
  const lit = litOf(layout, board, n)
  //counting down, a numbered wall shows the bulbs it still needs: its number less those beside it
  const shown = (i) => {
    if (!state.countdown || layout[i] === WHITE || layout[i] === BLANK) return layout[i]
    return layout[i] - besideOf(n)[i].filter((c) => board[c] === BULB).length
  }
  return (
    <Dialog
      clear={windowClear(state)}
      key={key}
      hidden={state.windowState !== 'open'}
      title={!phone && (state.theme === 'classic' ? 'Light Up' : 'Light Up Plus')}
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
          <Digit value={game.dealing ? 0 : darkLeft(layout, board, n)} />
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
            {n >= 10 && <PauseButton {...windowProps(state, actions, paused, running(game))} />}
          </div>
          <Digit
            value={game.time}
            digits={clockDigits(state.theme, game.time)}
            blank={!state.timer}
          />
        </div>
        <div class={running(game) && !paused ? s.active : s.inactive} style={{ '--n': n }}>
          {[...board].map((value, i) => (
            <Cell
              i={i}
              wall={hidden ? WHITE : layout[i]}
              number={hidden ? null : shown(i)}
              value={hidden ? EMPTY : value}
              lit={!hidden && lit[i]}
              error={errors && errors.has(i)}
              mark={marks[i]}
              cursor={!paused && state.cursor === i}
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
