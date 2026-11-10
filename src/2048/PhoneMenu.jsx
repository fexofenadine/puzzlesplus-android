import { h } from 'hyperapp'
import { Check, Chips, Item, Section, TROPHY } from '../shell/PhoneBar'
import { sizes } from './rules'

//2048's part of the options sheet: size and its options
const PhoneMenu = ({ state, actions }) => [
  <Section>
    <Chips
      label="Size"
      kind="segments"
      options={sizes.map((n) => [n, `${n} × ${n}`])}
      value={state.game.n}
      onPick={(n) => actions.newGame({ n })}
      actions={actions}
    />
    <div style={{ height: '6px' }} />
    <Check name="Timer" checked={state.timer} onToggle={actions.toggleTimer} />
    <Check name="Track losses" checked={state.trackLosses} onToggle={actions.toggleTrackLosses} />
    <Item d={TROPHY} name="Best scores" onClick={actions.toggleBestTime} actions={actions} />
  </Section>,
]

export default PhoneMenu
