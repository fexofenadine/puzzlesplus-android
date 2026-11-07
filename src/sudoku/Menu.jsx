import { h } from 'hyperapp'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import ThemeMenu from '../shell/ThemeMenu'
import ViewMenu from '../shell/ViewMenu'
import { gameLinks } from '../shell/GameLinks'
import { sizes } from './rules'
import { levels } from './techniques'

export const levelNames = ['Easy', 'Medium', 'Hard', 'Expert']

//every size deals every level for now, a size that can't goes here
export const allowed = () => true

//the level asked for, or the hardest one below it that the size allows
export const fallback = (n, level) => (allowed(n, level) ? level : fallback(n, level - 1))

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.reset()} />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <SubMenuItem name="Auto Notes" onClick={() => actions.autoNotes()} />
      <Separator />
      {levels.map((_, level) => (
        <SubMenuItem
          name={levelNames[level]}
          checked={state.game.level === level}
          disabled={!allowed(state.game.n, level)}
          onClick={() => actions.reset({ level })}
        />
      ))}
      <Separator />
      <SubMenuItem name="Show Errors" checked={state.errors} onClick={actions.toggleErrors} />
      <SubMenuItem name="Tidy Notes" checked={state.tidy} onClick={actions.toggleTidy} />
      <SubMenuItem name="Timer" checked={state.timer} onClick={actions.toggleTimer} />
      <Separator />
      <SubMenuItem name="Best Times..." onClick={actions.toggleBestTime} />
      <Separator />
      {gameLinks('sudoku')}
    </MenuItem>
    {sizes.length > 1 && (
      <MenuItem name="Size" type="size" active={state.menu} onChange={actions.toggleMenu}>
        {sizes.map((n) => (
          <SubMenuItem
            name={`${n} × ${n}`}
            checked={state.game.n === n}
            onClick={() => actions.reset({ n })}
          />
        ))}
      </MenuItem>
    )}
    <ViewMenu state={state} actions={actions} />
    <ThemeMenu state={state} actions={actions} />
    <MenuItem name="Help" type="help" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="How to Play..." onClick={actions.toggleHowTo} />
      <Separator />
      <SubMenuItem name="About Sudoku Plus..." onClick={actions.toggleAbout} />
    </MenuItem>
  </ul>
)

export default Menu
