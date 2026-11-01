import { h } from 'hyperapp'
import s from './Game.module.css'
import Dialog from './Dialog'
import Menu from './Menu'
import Digit from './Digit'
import Play from './Play'
import Cell from './Cell'
import SideButton, { HintIcon } from './shell/SideButton'
import WindowControls, { windowProps } from './shell/WindowControls'
import { PausedCover, HintPanel } from './shell/Board'
import { guideTopic } from './hint'
import { watchWindow } from './shell/zoom'
import { pageUrl, phone } from './shell/phone'
import { clockDigits } from './shell/clock'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

export const running = ({ start, win, lose }) => start >= 0 && !win && !lose

//wide boards on portrait screens are shown transposed, cells keep their own x and y
export const transposed = ({ portrait, game }) => portrait && game.width > game.height

const rowsOf = (state) => {
  const { field } = state.game
  if (!transposed(state)) return field.map((row, y) => row.map((cell, x) => ({ cell, x, y })))
  return field[0].map((_, x) => field.map((row, y) => ({ cell: row[x], x, y })))
}

const Face = ({ state, actions }) => (
  <Play
    pressed={state.game.pressed}
    lose={state.game.lose}
    win={state.game.win}
    onReset={actions.reset}
  />
)

const Game = ({ key, state, actions }) => (
  <Dialog
    key={key}
    hidden={state.windowState !== 'open'}
    title={!phone && (state.theme === 'classic' ? 'Minesweeper' : 'Minesweeper Plus')}
    titleHint="Double-click for 100% zoom"
    onTitleDoubleClick={() => actions.zoom(0)}
    controls={
      <WindowControls {...windowProps(state, actions, state.game.paused, running(state.game))} />
    }
    onClose={actions.close}
    onCreate={(dialog) => {
      watchWindow(dialog, actions.fit)
      actions.fit()
    }}
  >
    {!phone && <Menu state={state} actions={actions} />}
    <div class={s.root}>
      <div class={s.scoreboard}>
        <Digit value={state.game.flags} />
        {state.theme === 'classic' ? (
          <Face state={state} actions={actions} />
        ) : (
          //the hint button sits by the face off classic, the pair centred like takuzu's buttons
          <div class={s.buttons}>
            <Face state={state} actions={actions} />
            <SideButton
              title="Hint (H)"
              disabled={state.game.win || state.game.lose || state.game.paused}
              onClick={actions.hint}
            >
              <HintIcon />
            </SideButton>
          </div>
        )}
        <Digit value={state.game.time} digits={clockDigits(state.theme, state.game.time)} />
      </div>
      <div class={state.game.lose ? s.fieldLost : s.field}>
        {rowsOf(state).map((row) => (
          <div class={running(state.game) && !state.game.paused ? s.active : s.inactive}>
            {row.map(({ cell, x, y }) => (
              <Cell
                x={x}
                y={y}
                pressed={state.game.pressed}
                pressedX={state.game.pressedX}
                pressedY={state.game.pressedY}
                group={state.game.group}
                opened={cell.opened && !state.game.paused}
                mined={cell.mined}
                flag={cell.flag && !state.game.paused}
                mark={cell.mark && !state.game.paused}
                num={cell.num}
                hint={
                  !state.game.paused && state.hint && state.hint.marks[y * state.game.width + x]
                }
                lose={state.game.lose}
                onDown={actions.down}
                onMove={actions.move}
                onTouch={actions.touch}
                onChord={actions.chord}
              />
            ))}
          </div>
        ))}
        {state.game.paused && <PausedCover onResume={() => actions.pause(false)} />}
      </div>
      {state.hint && !state.game.paused && (
        <HintPanel text={state.hint.text} more={more(state.hint)} />
      )}
    </div>
  </Dialog>
)

export default Game
