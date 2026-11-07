import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './Sudoku.module.css'
import Dialog from '../Dialog'
import Digit from '../Digit'
import Play from '../Play'
import SideButton, { HintIcon, UndoIcon } from '../shell/SideButton'
import WindowControls, { windowProps } from '../shell/WindowControls'
import { PausedCover, HintPanel } from '../shell/Board'
import { guideTopic } from './hint'
import { watchWindow } from '../shell/zoom'
import { clockDigits } from '../shell/clock'
import Menu from './Menu'
import Cell from './Cell'
import { EMPTY, digitCounts, geometry, violations } from './rules'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && `guide/#${guideTopic(hint)}`

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

//grid tracks for n cells with thin lines between them and thicker ones between boxes
export const tracks = (n, box) =>
  Array.from({ length: n }, (_, k) =>
    k < n - 1 ? `var(--size) ${(k + 1) % box ? 1 : 2}px` : 'var(--size)',
  ).join(' ')

//the grid line a cell or pad button k sits on, past the line tracks
export const place = (k) => 2 * k + 1

//how a cell stands out: selected, the same digit as the focus, or sharing a unit with the selection
const lookOf = (i, { selected, focus, board, peers }) => {
  if (i === selected) return 'selected'
  if (focus && board[i] === focus) return 'same'
  if (peers && peers.has(i)) return 'peer'
  return null
}

const Pad = ({ state, actions, counts }) => {
  const { game, picked, noting } = state
  const { n } = game
  const off = game.dealing || game.paused || game.win
  return (
    <div class={s.pad}>
      <div class={s.digits} style={{ gridTemplateColumns: tracks(n, geometry(n).bw) }}>
        {Array.from({ length: n }, (_, k) => (
          <button
            type="button"
            tabindex={-1}
            class={[s.key, picked === k + 1 && s.picked, counts[k + 1] >= n && s.used]
              .filter(Boolean)
              .join(' ')}
            style={{ gridColumn: place(k) }}
            disabled={off}
            title={counts[k + 1] >= n ? `Every ${k + 1} is placed` : undefined}
            onclick={() => actions.pad({ d: k + 1 })}
          >
            {k + 1}
          </button>
        ))}
      </div>
      <div class={s.tools}>
        <button
          type="button"
          tabindex={-1}
          class={noting ? `${s.key} ${s.picked}` : s.key}
          title="Digits go in as notes (Space)"
          disabled={off}
          onclick={() => actions.toggleNoting()}
        >
          Notes {noting ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          tabindex={-1}
          class={s.key}
          title="Erase (Backspace)"
          disabled={off}
          onclick={() => actions.erase()}
        >
          Erase
        </button>
      </div>
    </div>
  )
}

const Game = ({ key, state, actions }) => {
  const { game, hint, selected, picked } = state
  const { n, board, givens, notes, paused } = game
  const { bw, bh, peers } = geometry(n)
  const errors = state.errors && !paused ? violations(board, n) : null
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
      key={key}
      hidden={state.windowState !== 'open'}
      title={state.theme === 'classic' ? 'Sudoku' : 'Sudoku Plus'}
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
          <Digit
            value={game.time}
            digits={clockDigits(state.theme, game.time)}
            blank={!state.timer}
          />
        </div>
        <div class={s.board}>
          <div
            class={running(game) && !paused ? s.active : s.inactive}
            style={{ '--tracks': tracks(n, bw), '--rows': tracks(n, bh) }}
          >
            {[...board].map((digit, i) => (
              <Cell
                i={i}
                digit={paused ? EMPTY : digit}
                given={givens[i] !== EMPTY}
                notes={paused ? 0 : notes[i]}
                n={n}
                cols={bw}
                focus={focus}
                look={!paused && !game.dealing && lookOf(i, seen)}
                error={errors && errors.has(i)}
                mark={marks[i]}
                ghost={ghosts[i]}
                style={{ gridColumn: place(i % n), gridRow: place(Math.floor(i / n)) }}
                onPress={actions.tap}
              />
            ))}
            {paused && <PausedCover onResume={() => actions.pause(false)} />}
          </div>
          <Pad state={state} actions={actions} counts={digitCounts(board, n)} />
        </div>
        {hint && !paused && <HintPanel text={hint.text} more={more(hint)} />}
      </div>
    </Dialog>
  )
}

export default Game
