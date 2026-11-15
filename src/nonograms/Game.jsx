import { h } from 'hyperapp'
import { cx } from '../shell/classes'
import g from '../Game.module.css'
import s from './Game.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import SideButton, {
  CrossIcon,
  FillIcon,
  HintIcon,
  PauseButton,
  UndoIcon,
} from '../shell/SideButton'
import WindowControls, { windowProps } from '../shell/WindowControls'
import { PausedCover, HintPanel } from '../shell/Board'
import { guideTopic } from './hint'
import { watchWindow } from '../shell/zoom'
import { pageUrl, phone } from '../shell/phone'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'
import Cell from './Cell'
import { EMPTY, FILL, CROSS, breaks, cellsOf, fillsLeft, lineDone } from './rules'
import { windowClear } from '../shell/actions'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

//what a solved picture is called and who drew it
const captionOf = ({ name, credit, licence }) => `${name}, ${credit} (${licence})`

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

//cells in blocks of five with a thin gap between, the same tracks for clues and cells
export const tracks = (n) =>
  Array.from({ length: n }, (_, k) => (k && k % 5 === 0 ? '2px var(--size)' : 'var(--size)')).join(
    ' ',
  )
export const place = (k) => k + Math.floor(k / 5) + 1

//the row and column under a mouse stand out, clues included, so a long line is easy to follow
//set on the board itself, a pointer move never draws the window again
const hover = (n) => (event) => {
  const board = event.currentTarget.parentNode
  const cell = event.pointerType === 'touch' ? null : event.target.closest('[data-cell]')
  if (!cell) return delete board.dataset.hover
  const i = Number(cell.dataset.cell)
  board.style.setProperty('--hover-row', place(Math.floor(i / n)))
  board.style.setProperty('--hover-column', place(i % n))
  board.dataset.hover = ''
}

const unhover = (event) => delete event.currentTarget.parentNode.dataset.hover

const Clue = ({ clue, done, error, hinted, hidden, style }) => (
  <div class={cx(s.clue, done && s.done, error && s.error, hinted && s.hinted)} style={style}>
    {!hidden &&
      (clue.length ? clue : [0]).map((run) => <span class={run > 9 && s.wide}>{run}</span>)}
  </div>
)

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, board, clues, paused } = game
  const marks = (!paused && hint && hint.marks) || {}
  const lines = cellsOf(n)
  const hidden = paused || game.dealing
  const broken =
    state.errors && !hidden ? new Set(breaks(board, n, clues).map((b) => b.line)) : null
  const done = lines.map((cells, line) => !hidden && lineDone(board, cells, clues[line]))
  const left = fillsLeft(board, n, clues)
  //each clue sits on its line's track, skipping the gaps between blocks
  const clue = (line) => (
    <Clue
      clue={clues[line]}
      done={done[line]}
      error={broken && broken.has(line)}
      hinted={!paused && hint && hint.line === line}
      hidden={hidden}
      style={line < n ? { gridRow: place(line) } : { gridColumn: place(line - n) }}
    />
  )
  return (
    <Dialog
      clear={windowClear(state)}
      key={key}
      hidden={state.windowState !== 'open'}
      title={!phone && (state.theme === 'classic' ? 'Nonograms' : 'Nonograms Plus')}
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
            {game.n >= 15 && (
              <PauseButton {...windowProps(state, actions, paused, running(game))} />
            )}
            {state.touch && (
              <SideButton
                title={state.mode === FILL ? 'Taps fill cells' : 'Taps cross cells out'}
                disabled={game.win || paused}
                onClick={() => actions.setMode(state.mode === FILL ? CROSS : FILL)}
              >
                {state.mode === FILL ? <FillIcon /> : <CrossIcon />}
              </SideButton>
            )}
          </div>
          <Digit
            value={game.time}
            digits={clockDigits(state.theme, game.time)}
            blank={!state.timer}
          />
        </div>
        <div class={s.board} style={{ '--tracks': tracks(n) }}>
          <div class={s.columns}>
            <div class={s.columnBand} />
            {lines.slice(n).map((_, x) => clue(n + x))}
          </div>
          <div class={s.rows}>
            <div class={s.rowBand} />
            {lines.slice(0, n).map((_, y) => clue(y))}
          </div>
          <div
            class={running(game) && !paused ? s.active : s.inactive}
            onpointermove={hover(n)}
            onpointerleave={unhover}
          >
            <div class={s.rowBand} hidden={hidden || game.win} />
            <div class={s.columnBand} hidden={hidden || game.win} />
            {[...board].map((value, i) => (
              <Cell
                i={i}
                value={paused ? EMPTY : value}
                win={game.win}
                mark={marks[i]}
                cursor={!paused && state.cursor === i}
                style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
                onPress={actions.down}
              />
            ))}
            {paused && <PausedCover onResume={() => actions.pause(false)} />}
          </div>
        </div>
        {hint && !paused && <HintPanel text={hint.text} more={more(hint)} />}
        {game.win && game.art && <HintPanel text={captionOf(game.art)} />}
      </div>
    </Dialog>
  )
}

export default Game
