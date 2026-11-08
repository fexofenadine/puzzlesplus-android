import { h } from 'hyperapp'
import { Check, Chips, Item, Section } from '../shell/PhoneBar'
import { allowed, levelNames } from './Menu'
import { sizes } from './rules'
import { levels } from './techniques'

//sudoku's part of the phone drawer: playing, difficulty, size while there are several, options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Item glyph="↻" name="New game" onClick={() => actions.newGame()} actions={actions} />
    <Item glyph="?" name="Hint" onClick={() => actions.hint()} actions={actions} />
    <Item glyph="↶" name="Undo" onClick={() => actions.undo()} actions={actions} />
    <Item glyph="✎" name="Auto Notes" onClick={() => actions.autoNotes()} actions={actions} />
  </Section>,
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
    <Item glyph="🏆" name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
