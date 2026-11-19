import { h } from 'hyperapp'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import { steps } from './zoom'
import { phone } from './phone'
import { effectsOf } from './glitches'

//zoom and maximise, the same in every game, and the retro themes' glitches
const ViewMenu = ({ state, actions }) => {
  //a phone's window always fills the screen
  if (phone) return null
  const { scale, maximised } = state.zoom
  return (
    <MenuItem name="View" type="view" active={state.menu} onChange={actions.toggleMenu}>
      <SubMenuItem
        name="Zoom In"
        hotKey="+"
        disabled={scale >= steps[steps.length - 1]}
        onClick={() => actions.zoom(1)}
      />
      <SubMenuItem
        name="Zoom Out"
        hotKey="-"
        disabled={scale <= steps[0]}
        onClick={() => actions.zoom(-1)}
      />
      <SubMenuItem
        name="Actual Size"
        checked={!maximised && scale === 1}
        onClick={() => actions.zoom(0)}
      />
      <Separator />
      <SubMenuItem name="Maximise" checked={maximised} onClick={() => actions.maximise()} />
      {effectsOf(state.theme).length > 0 && <Separator />}
      {effectsOf(state.theme).length > 0 && (
        <SubMenuItem name="Glitches..." onClick={actions.toggleGlitches} />
      )}
    </MenuItem>
  )
}

export default ViewMenu
