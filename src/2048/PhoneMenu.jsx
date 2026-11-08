import { h } from 'hyperapp'
import { Check, Chips, Item, Section } from '../shell/PhoneBar'
import { sizes } from './rules'

//2048's part of the phone drawer: playing, size and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Item glyph="↻" name="New game" onClick={() => actions.newGame()} actions={actions} />
    <Item glyph="?" name="Hint" onClick={() => actions.hint()} actions={actions} />
    <Item glyph="↶" name="Undo" onClick={() => actions.undo()} actions={actions} />
  </Section>,
  <Section>
    <Chips
      label="Size"
      options={sizes.map((n) => [n, `${n} × ${n}`])}
      value={state.game.n}
      onPick={(n) => actions.newGame({ n })}
      actions={actions}
    />
    <div style={{ height: '6px' }} />
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Item glyph="🏆" name="Best scores" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
