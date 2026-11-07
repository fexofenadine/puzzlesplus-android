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
import { pageUrl, phone } from '../shell/phone'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'

export const running = ({ start, over }) => start >= 0 && !over

//cells shrink a little as boards grow, so every size makes a similar window
export const cellSizes = { 3: 72, 4: 60, 5: 52, 6: 46 }

//a tile's look: its power of two picks the colour and the css the text that reads on it
//its digit count picks the font size
//slides a tile from the cell it was drawn on to its new one in the original's 100 ms
//animated from script because a keyed update can put a tile back into the page, which cancels a
//css transition
const glide = (element, from, to) => {
  if (from[0] === to[0] && from[1] === to[1]) return
  if (!element.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const board = element.parentNode.parentNode
  const step = element.offsetWidth + parseFloat(getComputedStyle(board).columnGap || 0)
  const dx = (from[0] - to[0]) * step
  const dy = (from[1] - to[1]) * step
  element.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], {
    duration: 100,
    easing: 'ease-in-out',
  })
}

//offset is where a drag holds it, in cells; still means the finger moves it, so no glide
export const Tile = ({ tile, n, offset, still }) => {
  const k = Math.log2(tile.value)
  const [ox, oy] = offset || [0, 0]
  const x = (tile.cell % n) + ox
  const y = Math.floor(tile.cell / n) + oy
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
      style={{ '--x': x, '--y': y, '--k': k }}
      onupdate={(element, old) =>
        !still && glide(element, [old.style['--x'], old.style['--y']], [x, y])
      }
    >
      {tile.value}
    </div>
  )
}

//the tiles in the order they were made, so few elements move in the page
const byId = (a, b) => a.id - b.id

//the sunken cells and the tiles over them, drawn for the game and the guide alike
//drag holds tiles off their cells while a finger moves them
export const Board = ({ n, tiles, hidden, drag, onDown }, children) => (
  <div class={s.board} style={{ '--n': n, '--cell': `${cellSizes[n]}px` }} onpointerdown={onDown}>
    {Array.from({ length: n * n }, () => (
      <div class={s.cell} />
    ))}
    {!hidden && (
      <div class={s.tiles}>
        {[...tiles]
          .sort(byId)
          .map((tile) => Tile({ tile, n, offset: drag && drag[tile.id], still: Boolean(drag) }))}
      </div>
    )}
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
      title={!phone && (state.theme === 'classic' ? '2048' : '2048 Plus')}
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
        <Board
          n={n}
          tiles={game.tiles}
          hidden={paused}
          drag={state.drag}
          onDown={actions.swipeStart}
        >
          {paused && <PausedCover onResume={() => actions.pause(false)} />}
        </Board>
        {hint && !paused && (
          <HintPanel text={hint.text} more={hint.kind === 'move' && pageUrl('guide/#hints')} />
        )}
      </div>
    </Dialog>
  )
}

export default Game
