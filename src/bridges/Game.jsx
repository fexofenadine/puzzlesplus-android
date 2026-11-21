import { h } from 'hyperapp'
import g from '../Game.module.css'
import s from './Bridges.module.css'
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
import { degreesOf, linksOf, unfinished, violations } from './rules'
import { windowClear } from '../shell/actions'
import { pageUrl, phone } from '../shell/phone'

//the guide's section on a hint, none for a solved board
const more = (hint) => guideTopic(hint) && pageUrl(`guide/#${guideTopic(hint)}`)

export const running = ({ start, win, dealing }) => start >= 0 && !win && !dealing

//each water cell's bridge, a hint's faint one, or a link it rules out, by cell
export const drawings = (islands, n, board, marks) => {
  const { links } = linksOf(islands, n)
  const bridge = new Map()
  const ghost = new Map()
  const none = new Set()
  links.forEach(({ across, cells }, l) => {
    if (board[l] > 0) for (const c of cells) bridge.set(c, { across, count: board[l] })
    const mark = marks.links && marks.links[l]
    if (!mark) return
    if (mark.kind === 'none') none.add(cells[Math.floor(cells.length / 2)])
    else if (mark.count > 0) {
      for (const c of cells) {
        ghost.set(c, { across, count: mark.count, wrong: mark.kind === 'wrong' })
      }
    }
  })
  return { bridge, ghost, none }
}

const Game = ({ key, state, actions }) => {
  const { game, hint } = state
  const { n, islands, board, paused } = game
  const hidden = paused || game.dealing
  const errors = state.errors && !hidden ? violations(islands, n, board) : null
  const marks = (!paused && hint && hint.marks) || { cells: {}, links: {} }
  const degree = degreesOf(islands, n, board)
  const { bridge, ghost, none } = hidden
    ? { bridge: new Map(), ghost: new Map(), none: new Set() }
    : drawings(islands, n, board, marks)
  return (
    <Dialog
      clear={windowClear(state)}
      key={key}
      hidden={state.windowState !== 'open'}
      title={!phone && (state.theme === 'classic' ? 'Bridges' : 'Bridges Plus')}
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
          <Digit value={game.dealing ? 0 : unfinished(islands, n, board)} />
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
          {[...islands].map((island, i) => (
            <Cell
              i={i}
              island={hidden ? 0 : island}
              bridge={bridge.get(i)}
              ghost={ghost.get(i)}
              none={none.has(i)}
              done={!hidden && island > 0 && degree[i] === island}
              error={errors && errors.has(i)}
              mark={marks.cells[i]}
              selected={!paused && state.selected === i}
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
