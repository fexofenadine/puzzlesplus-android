import { h } from 'hyperapp'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import { backgroundFor } from './backgrounds'
import { themes } from './themes'
import { isGame } from './actions'
import { motions } from './motion'
import { steps } from './zoom'
import { effectsOf } from './glitches'

//zoom and maximise, which only game windows have
const zoomItems = (state, actions) => {
  const { scale, maximised } = state.zoom
  return [
    <SubMenuItem
      name="Zoom In"
      hotKey="+"
      disabled={scale >= steps[steps.length - 1]}
      onClick={() => actions.zoom(1)}
    />,
    <SubMenuItem
      name="Zoom Out"
      hotKey="-"
      disabled={scale <= steps[0]}
      onClick={() => actions.zoom(-1)}
    />,
    <SubMenuItem
      name="Actual Size"
      checked={!maximised && scale === 1}
      onClick={() => actions.zoom(0)}
    />,
    <SubMenuItem name="Maximise" checked={maximised} onClick={() => actions.maximise()} />,
    <Separator />,
  ]
}

//the display menu every page shares: zoom, the theme and motion flyouts, the background and window
//options and the retro themes' glitches; a game's own display options go after them
const DisplayMenu = ({ state, actions }, children) => (
  <MenuItem name="Display" type="display" active={state.menu} onChange={actions.toggleMenu}>
    {isGame(state.page) && zoomItems(state, actions)}
    <SubMenuItem name="Theme">
      {themes.map(([theme, name]) => (
        <SubMenuItem
          name={name}
          checked={state.theme === theme}
          onClick={() => actions.setTheme(theme)}
        />
      ))}
    </SubMenuItem>
    <SubMenuItem name="Motion">
      {motions.map(([motion, name]) => (
        <SubMenuItem
          name={name}
          checked={state.motion === motion}
          onClick={() => actions.setMotion(motion)}
        />
      ))}
    </SubMenuItem>
    {(backgroundFor(state.theme) || isGame(state.page)) && <Separator />}
    {backgroundFor(state.theme) ? (
      <SubMenuItem name="Background Settings..." onClick={actions.toggleBackgroundSettings} />
    ) : (
      isGame(state.page) && (
        <SubMenuItem name="Window Settings..." onClick={actions.toggleBackgroundSettings} />
      )
    )}
    {backgroundFor(state.theme) && (
      <SubMenuItem
        name="Animated"
        checked={state.backgrounds[backgroundFor(state.theme)].animated}
        onClick={actions.toggleAnimated}
      />
    )}
    {isGame(state.page) && (
      <SubMenuItem
        name="Hide Window"
        checked={state.glass.hidden}
        onClick={actions.toggleHideWindow}
      />
    )}
    {isGame(state.page) && (
      <SubMenuItem name="Fireworks" checked={state.fireworks} onClick={actions.toggleFireworks} />
    )}
    {effectsOf(state.theme).length > 0 && (
      <SubMenuItem name="Glitches..." onClick={actions.toggleGlitches} />
    )}
    {children}
  </MenuItem>
)

export default DisplayMenu
