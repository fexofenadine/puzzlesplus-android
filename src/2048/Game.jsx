import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './Board2048.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import SideButton, { HintIcon, UndoIcon } from '../shell/SideButton'
import WindowControls, { windowProps } from '../shell/WindowControls'
import { PausedCover, HintPanel } from '../shell/Board'
import { watchWindow } from '../shell/zoom'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'

export const running = ({ start, over }) => start >= 0 && !over

//cells shrink a little as boards grow, so every size makes a similar window
export const cellSizes = { 3: 72, 4: 60, 5: 52, 6: 46 }

//a tile's look: its power of two picks the colour and the css the text that reads on it
//its digit count picks the font size
export const Tile = ({ tile, n }) => {
  const k = Math.log2(tile.value)
  return (
    <div
      key={tile.id}
      class={[
        s.tile,
        k > 11 && s.beyond,
        tile.fresh && s.fresh,
        tile.merged && s.merged,
        tile.gone && s.gone,
      ]
        .filter(Boolean)
        .join(' ')}
      data-digits={Math.min(5, String(tile.value).length)}
      style={{ '--x': tile.cell % n, '--y': Math.floor(tile.cell / n), '--k': k }}
    >
      {tile.value}
    </div>
  )
}

//the sunken cells and the tiles over them, drawn for the game and the guide alike
export const Board = ({ n, tiles, hidden, onDown }, children) => (
  <div class={s.board} style={{ '--n': n, '--cell': `${cellSizes[n]}px` }} onpointerdown={onDown}>
    {Array.from({ length: n * n }, () => (
      <div class={s.cell} />
    ))}
    {!hidden && <div class={s.tiles}>{tiles.map((tile) => Tile({ tile, n }))}</div>}
    {children}
  </div>
)

//digits enough for the score, four at least
const scoreDigits = (score) => Math.max(4, String(score).length)

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, paused } = game
  return (
    <Dialog
      key={key}
      hidden={state.windowState !== 'open'}
      title={state.theme === 'classic' ? '2048' : '2048 Plus'}
      titleHint="Double-click for 100% zoom"
      onTitleDoubleClick={() => actions.zoom(0)}
      controls={<WindowControls {...windowProps(state, actions, paused, running(game))} />}
      onClose={actions.close}
      onCreate={(dialog) => {
        watchWindow(dialog, actions.fit)
        actions.fit()
      }}
    >
      <Menu state={state} actions={actions} />
      <div class={g.root}>
        <div class={g.scoreboard}>
          <Digit value={game.score} digits={scoreDigits(game.score)} />
          <div class={g.buttons}>
            <SideButton
              title="Undo (Ctrl+Z)"
              disabled={!game.history.length || paused}
              onClick={actions.undo}
            >
              <UndoIcon />
            </SideButton>
            <Play
              pressed={false}
              lose={game.over && !game.reached}
              win={game.over && game.reached}
              onReset={actions.reset}
            />
            <SideButton title="Hint (H)" disabled={game.over || paused} onClick={actions.hint}>
              <HintIcon />
            </SideButton>
          </div>
          <Digit
            value={game.time}
            digits={clockDigits(state.theme, game.time)}
            blank={!state.timer}
          />
        </div>
        <Board n={n} tiles={game.tiles} hidden={paused} onDown={actions.swipeStart}>
          {paused && <PausedCover onResume={() => actions.pause(false)} />}
        </Board>
        {hint && !paused && (
          <HintPanel text={hint.text} more={hint.kind === 'move' && 'guide/#hints'} />
        )}
      </div>
    </Dialog>
  )
}

export default Game
