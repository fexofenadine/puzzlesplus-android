import { h } from 'hyperapp'
import { Check, Chips, Item, Section } from '../shell/PhoneBar'
import { allowed, levelNames } from './Menu'
import { sizes } from './rules'

//nonograms' part of the phone drawer: playing, difficulty, size and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Item glyph="↻" name="New game" onClick={() => actions.newGame()} actions={actions} />
    <Item glyph="?" name="Hint" onClick={() => actions.hint()} actions={actions} />
    <Item glyph="↶" name="Undo" onClick={() => actions.undo()} actions={actions} />
  </Section>,
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
      options={sizes.map((n) => [n, String(n)])}
      value={state.game.n}
      onPick={(n) => actions.newGame({ n })}
      actions={actions}
    />
    <div style={{ height: '6px' }} />
    <Check name="Show Errors" checked={state.errors} onToggle={actions.toggleErrors} />
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Item glyph="🏆" name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

//rain glyphs sit with the theme, on matrix
export const look = (state, actions) =>
  state.theme === 'matrix' && (
    <Check name="Rain Glyphs" checked={state.rain} onToggle={actions.toggleRain} />
  )

export default PhoneMenu
