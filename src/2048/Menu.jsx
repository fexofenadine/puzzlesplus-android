import { h } from 'hyperapp'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import DisplayMenu from '../shell/DisplayMenu'
import { resumeItems } from '../shell/ResumeItems'
import { gameLinks } from '../shell/GameLinks'
import { HelpMenu, SizeMenu } from '../shell/GameMenus'
import { sizes } from './rules'

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.newGame()} />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
      <Separator />
      <SubMenuItem name="Timer" checked={state.timer} onClick={actions.toggleTimer} />
      <SubMenuItem
        name="Track Losses"
        checked={state.trackLosses}
        onClick={actions.toggleTrackLosses}
      />
      <Separator />
      <SubMenuItem name="Best Scores..." onClick={actions.toggleBestTime} />
      <Separator />
      {resumeItems(state, actions)}
      {gameLinks('2048')}
    </MenuItem>
    <SizeMenu state={state} actions={actions} sizes={sizes} />
    <DisplayMenu state={state} actions={actions} />
    <HelpMenu state={state} actions={actions} name="2048 Plus" />
  </ul>
)

export default Menu
