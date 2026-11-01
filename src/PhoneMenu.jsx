import { h } from 'hyperapp'
import { Check, Chips, Item, Section } from './shell/PhoneBar'

const levels = [
  ['beginner', 'Beginner'],
  ['intermediate', 'Intermediate'],
  ['expert', 'Expert'],
  ['extreme', 'Extreme'],
]

//minesweeper's part of the phone drawer: playing, difficulty and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Item glyph="↻" name="New game" onClick={() => actions.reset()} actions={actions} />
    <Item glyph="?" name="Hint" onClick={() => actions.hint()} actions={actions} />
  </Section>,
  <Section>
    <Chips
      label="Difficulty"
      options={[...levels, ['custom', 'Custom…']]}
      value={state.game.level}
      onPick={(level) =>
        level === 'custom' ? actions.toggleCustomField() : actions.reset({ level })
      }
      actions={actions}
    />
    <div style={{ height: '6px' }} />
    <Check name="No Guessing" checked={state.noGuess} onToggle={actions.toggleNoGuess} />
    <Check
      name="Safe First Click"
      checked={state.safeStart || state.noGuess}
      onToggle={actions.toggleSafeStart}
    />
    <Check name="Marks (?)" checked={state.marks} onToggle={actions.toggleMarks} />
    <Item glyph="🏆" name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
