import { h } from 'hyperapp'
import { Check, Chips, Item, PlayItems, Section, TROPHY } from '../shell/PhoneBar'
import { allowed, levelNames } from './Menu'
import { sizes } from './rules'
import { levels } from './techniques'

//sudoku's part of the options sheet: difficulty, size while there are several, options

//material symbols' edit pencil
const NOTES =
  'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Chips
      label="Difficulty"
      options={levels.map((_, level) => [level, levelNames[level], !allowed(state.game.n, level)])}
      value={state.game.level}
      onPick={(level) => actions.newGame({ level })}
      actions={actions}
    />
    {sizes.length > 1 && (
      <Chips
        label="Size"
        kind="segments"
        options={sizes.map((n) => [n, String(n)])}
        value={state.game.n}
        onPick={(n) => actions.newGame({ n })}
        actions={actions}
      />
    )}
    <div style={{ height: '6px' }} />
    <Check name="Show Errors" checked={state.errors} onToggle={actions.toggleErrors} />
    <Check name="Tidy Notes" checked={state.tidy} onToggle={actions.toggleTidy} />
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Item d={NOTES} name="Auto Notes" onClick={() => actions.autoNotes()} actions={actions} />
    <PlayItems state={state} actions={actions} />
    <Item d={TROPHY} name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
