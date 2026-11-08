import { h } from 'hyperapp'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import ThemeMenu from '../shell/ThemeMenu'
import ViewMenu from '../shell/ViewMenu'
import { resumeItems } from '../shell/ResumeItems'
import { gameLinks } from '../shell/GameLinks'
import { sizes } from './rules'

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.newGame()} />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <Separator />
      <SubMenuItem name="Timer" checked={state.timer} onClick={actions.toggleTimer} />
      <Separator />
      <SubMenuItem name="Best Scores..." onClick={actions.toggleBestTime} />
      <Separator />
      {resumeItems(state, actions)}
      {gameLinks('2048')}
    </MenuItem>
    <MenuItem name="Size" type="size" active={state.menu} onChange={actions.toggleMenu}>
      {sizes.map((n) => (
        <SubMenuItem
          name={`${n} × ${n}`}
          checked={state.game.n === n}
          onClick={() => actions.newGame({ n })}
        />
      ))}
    </MenuItem>
    <ViewMenu state={state} actions={actions} />
    <ThemeMenu state={state} actions={actions} />
    <MenuItem name="Help" type="help" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="How to Play..." onClick={actions.toggleHowTo} />
      <Separator />
      <SubMenuItem name="About 2048 Plus..." onClick={actions.toggleAbout} />
    </MenuItem>
  </ul>
)

export default Menu
