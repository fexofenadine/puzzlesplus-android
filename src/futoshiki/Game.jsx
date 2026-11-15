import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './Futoshiki.module.css'
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
import Cell from '../sudoku/Cell'
import { Pad, lookOf } from '../sudoku/Game'
import { EMPTY, LESS, NONE, digitCounts, geometry, violations } from './rules'
import { windowClear } from '../shell/actions'
import { pageUrl, phone } from '../shell/phone'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

//cells with a gap between them for the signs, the same tracks across and down
export const tracks = (n) => Array.from({ length: n }, () => 'var(--size)').join(' var(--gap) ')

//the pad's digits spread over the field's width
const padTracks = (n) => Array.from({ length: n }, () => '1fr').join(' 4px ')

//the grid line cell k sits on, and the gap after it
export const place = (k) => 2 * k + 1

//notes sit in rows of two on the smallest board, three on the others
export const noteColumns = (n) => (n <= 4 ? 2 : 3)

//the signs of a board: one glyph, turned a quarter for the signs between rows
export const Signs = ({ n, right, down }) =>
  [...right.keys()].flatMap((i) => {
    const column = place(i % n)
    const row = place(Math.floor(i / n))
    return [
      right[i] !== NONE && (
        <span class={s.sign} style={{ gridColumn: column + 1, gridRow: row }}>
          {right[i] === LESS ? '<' : '>'}
        </span>
      ),
      down[i] !== NONE && (
        <span class={s.turned} style={{ gridColumn: column, gridRow: row + 1 }}>
          {down[i] === LESS ? '<' : '>'}
        </span>
      ),
    ]
  })

const Game = ({ key, state, actions }) => {
  const { game, hint, selected, picked } = state
  const { n, board, givens, notes, paused } = game
  const { peers } = geometry(n)
  const hidden = paused || game.dealing
  const errors = state.errors && !hidden ? violations(board, game) : null
  const marks = (!paused && hint && hint.marks) || {}
  const ghosts = (!paused && hint && hint.place && Object.fromEntries(hint.place)) || {}
  const left = board.filter((v) => v === EMPTY).length
  const focus = picked || (selected >= 0 ? board[selected] : 0)
  const seen = {
    selected,
    focus,
    board,
    peers: selected >= 0 ? new Set(peers[selected]) : null,
  }
  return (
    <Dialog
      clear={windowClear(state)}
      key={key}
      hidden={state.windowState !== 'open'}
      title={!phone && (state.theme === 'classic' ? 'Futoshiki' : 'Futoshiki Plus')}
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
            {n >= 6 && <PauseButton {...windowProps(state, actions, paused, running(game))} />}
          </div>
          <Digit
            value={game.time}
            digits={clockDigits(state.theme, game.time)}
            blank={!state.timer}
          />
        </div>
        <div class={s.board}>
          <div
            class={running(game) && !paused ? s.active : s.inactive}
            style={{ '--tracks': tracks(n) }}
          >
            {[...board].map((digit, i) => (
              <Cell
                i={i}
                digit={paused ? EMPTY : digit}
                given={givens[i] !== EMPTY}
                notes={paused ? 0 : notes[i]}
                n={n}
                cols={noteColumns(n)}
                focus={focus}
                look={!hidden && lookOf(i, seen)}
                error={errors && errors.has(i)}
                mark={marks[i]}
                ghost={ghosts[i]}
                style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
                onPress={actions.tap}
              />
            ))}
            {!hidden && <Signs n={n} right={game.right} down={game.down} />}
            {paused && <PausedCover onResume={() => actions.pause(false)} />}
          </div>
          <Pad
            state={state}
            actions={actions}
            counts={digitCounts(board, n)}
            columns={padTracks(n)}
          />
        </div>
        {hint && !paused && <HintPanel text={hint.text} more={more(hint)} />}
      </div>
    </Dialog>
  )
}

export default Game
