import { h } from 'hyperapp'
import { Check, Chips, Item, Section, TROPHY } from '../shell/PhoneBar'
import { allowed, levelNames } from './Menu'
import { sizes } from './rules'

//a material image icon
const PICTURE =
  'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'

//nonograms' part of the options sheet: difficulty, size and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Chips
      label="Difficulty"
      options={levelNames.map((name, level) => [level, name, !allowed(state.game.n, level)])}
      value={state.game.level}
      onPick={(level) => actions.newGame({ level })}
      actions={actions}
    />
    <Chips
      label="Size"
      kind="segments"
      options={sizes.map((n) => [n, String(n)])}
      value={state.game.n}
      onPick={(n) => actions.newGame({ n })}
      actions={actions}
    />
    <div style={{ height: '6px' }} />
    <Check name="Procedural" checked={state.procedural} onToggle={actions.toggleProcedural} />
    {state.procedural && (
      <Check name="Symmetric" checked={state.symmetric} onToggle={actions.toggleSymmetric} />
    )}
    {!state.procedural && (
      <Item d={PICTURE} name="Choose picture" onClick={actions.togglePictures} actions={actions} />
    )}
    <Check name="Show Errors" checked={state.errors} onToggle={actions.toggleErrors} />
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Item d={TROPHY} name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

//rain glyphs sit with the theme, on matrix
export const look = (state, actions) =>
  state.theme === 'matrix' && (
    <Check name="Rain Glyphs" checked={state.rain} onToggle={actions.toggleRain} />
  )

export default PhoneMenu
