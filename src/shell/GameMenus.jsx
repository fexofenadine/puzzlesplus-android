import { h } from 'hyperapp'
import { MenuItem, Separator, SubMenuItem } from '../Menu'

//the board sizes a game deals, the one in play checked
export const SizeMenu = ({ state, actions, sizes }) => (
  <MenuItem name="Size" type="size" active={state.menu} onChange={actions.toggleMenu}>
    {sizes.map((n) => (
      <SubMenuItem
        name={`${n} × ${n}`}
        checked={state.game.n === n}
        onClick={() => actions.newGame({ n })}
      />
    ))}
  </MenuItem>
)

//how to play and about, name is the game's full name
export const HelpMenu = ({ state, actions, name }) => (
  <MenuItem name="Help" type="help" active={state.menu} onChange={actions.toggleMenu}>
    <SubMenuItem name="How to Play..." onClick={actions.toggleHowTo} />
    <Separator />
    <SubMenuItem name={`About ${name}...`} onClick={actions.toggleAbout} />
  </MenuItem>
)
