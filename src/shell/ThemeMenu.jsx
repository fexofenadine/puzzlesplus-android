import { h } from 'hyperapp'
import { MenuItem, Separator, SubMenuItem } from '../Menu'
import { backgroundFor } from './backgrounds'
import { themes } from './themes'
import { isGame } from './actions'
import { motions } from './motion'

//the theme menu every game shares, a game's own theme options go after it
const ThemeMenu = ({ state, actions }, children) => (
  <MenuItem name="Theme" type="theme" active={state.menu} onChange={actions.toggleMenu}>
    {themes.map(([theme, name]) => (
      <SubMenuItem
        name={name}
        checked={state.theme === theme}
        onClick={() => actions.setTheme(theme)}
      />
    ))}
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
    {children}
    <Separator />
    {motions.map(([motion, name]) => (
      <SubMenuItem
        name={name}
        checked={state.motion === motion}
        onClick={() => actions.setMotion(motion)}
      />
    ))}
  </MenuItem>
)

export default ThemeMenu
