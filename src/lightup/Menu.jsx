import { h } from 'hyperapp'
import { dailyNote } from '../shell/daily'
import m from '../Menu.module.css'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import DisplayMenu from '../shell/DisplayMenu'
import { resumeItems } from '../shell/ResumeItems'
import { gameLinks } from '../shell/GameLinks'
import { HelpMenu, SizeMenu } from '../shell/GameMenus'
import { sizes } from './rules'
import { levels } from './techniques'

export const levelNames = ['Easy', 'Medium', 'Hard', 'Expert']

//every size deals every level
export const allowed = (n, level) => level >= 0 && level < levelNames.length

export const fallback = (n, level) => (allowed(n, level) ? level : 0)

const Menu = ({ state, actions }) => (
  <ul class={m.root} tabindex={-1} onfocusout={actions.toggleMenu}>
    <MenuItem name="Game" type="game" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem name="New" hotKey="F2" onClick={() => actions.newGame()} />
      <SubMenuItem
        name="Daily Puzzle"
        hotKey={dailyNote(state.menu, 'lightup')}
        checked={Boolean(state.game.daily)}
        onClick={() => actions.newGame({ daily: true })}
      />
      <SubMenuItem name="Undo" hotKey="Ctrl+Z" onClick={() => actions.undo()} />
      <SubMenuItem name="Redo" hotKey="Ctrl+Y" onClick={() => actions.redo()} />
      <SubMenuItem name="Hint" hotKey="H" onClick={() => actions.hint()} />
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
      <SubMenuItem
        name="Count Down Numbers"
        checked={state.countdown}
        onClick={actions.toggleCountdown}
      />
      <SubMenuItem name="Timer" checked={state.timer} onClick={actions.toggleTimer} />
      <Separator />
      <SubMenuItem name="Copy Link..." onClick={() => actions.share()} />
      <SubMenuItem name="Best Times..." onClick={actions.toggleBestTime} />
      <Separator />
      {resumeItems(state, actions)}
      {gameLinks('lightup')}
    </MenuItem>
    <SizeMenu state={state} actions={actions} sizes={sizes} />
    <DisplayMenu state={state} actions={actions} />
    <HelpMenu state={state} actions={actions} name="Light Up Plus" />
  </ul>
)

export default Menu
