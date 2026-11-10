import { h } from 'hyperapp'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import ThemeMenu from '../shell/ThemeMenu'
import ViewMenu from '../shell/ViewMenu'
import { resumeItems } from '../shell/ResumeItems'
import { gameLinks } from '../shell/GameLinks'
import { HelpMenu, SizeMenu } from '../shell/GameMenus'
import { allowed, fallback, sizes } from './rules'
import { levels } from './techniques'

export const levelNames = ['Easy', 'Medium', 'Hard', 'Expert']

export { allowed, fallback }

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.newGame()} />
      <SubMenuItem
        name="Daily Puzzle"
        checked={Boolean(state.game.daily)}
        onClick={() => actions.newGame({ daily: true })}
      />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Redo" hotKey="Ctrl+Y" onClick={() => actions.redo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <SubMenuItem name="Auto Notes" onClick={() => actions.autoNotes()} />
      <Separator />
      {levels.map((_, level) => (
        <SubMenuItem
          name={levelNames[level]}
          checked={state.game.level === level}
          disabled={!allowed(state.game.n, level)}
          onClick={() => actions.newGame({ level })}
        />
      ))}
      <Separator />
      <SubMenuItem name="Show Errors" checked={state.errors} onClick={actions.toggleErrors} />
      <SubMenuItem name="Tidy Notes" checked={state.tidy} onClick={actions.toggleTidy} />
      <SubMenuItem name="Timer" checked={state.timer} onClick={actions.toggleTimer} />
      <Separator />
      <SubMenuItem name="Copy Link..." onClick={() => actions.share()} />
      <SubMenuItem name="Best Times..." onClick={actions.toggleBestTime} />
      <Separator />
      {resumeItems(state, actions)}
      {gameLinks('sudoku')}
    </MenuItem>
    <SizeMenu state={state} actions={actions} sizes={sizes} />
    <ViewMenu state={state} actions={actions} />
    <ThemeMenu state={state} actions={actions} />
    <HelpMenu state={state} actions={actions} name="Sudoku Plus" />
  </ul>
)

export default Menu
