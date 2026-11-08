import { h } from 'hyperapp'
import { Check, Chips, Item, Section, TROPHY } from './shell/PhoneBar'

const levels = [
  ['beginner', 'Beginner'],
  ['intermediate', 'Intermediate'],
  ['expert', 'Expert'],
  ['extreme', 'Extreme'],
]

//minesweeper's part of the options sheet: difficulty and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Chips
      label="Difficulty"
      options={[...levels, ['custom', 'Custom…']]}
      value={state.game.level}
      onPick={(level) =>
        level === 'custom' ? actions.toggleCustomField() : actions.newGame({ level })
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
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Item d={TROPHY} name="Best times" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
