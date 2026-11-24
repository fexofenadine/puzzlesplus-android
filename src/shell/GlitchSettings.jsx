import { h } from 'hyperapp'
import s from './BackgroundSettings.module.css'
import g from './GlitchSettings.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { effectsOf } from './glitches'
import { keys } from './keys'

//names as a sentence starts them: "Torn bands, corrupted columns and signal drops"
const listed = (names) =>
  names
    .map((name, k) => (k ? name.toLowerCase() : name))
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1')

//one checkbox per effect
const Row = ({ effect, on, actions }) => (
  <label class={s.row}>
    <span class={s.name}>{effect.name}</span>
    <input
      type="checkbox"
      class={s.check}
      checked={on}
      onchange={(event) => actions.setEffect([effect.id, event.target.checked])}
    />
  </label>
)

//view → glitches: the theme's screen effects, each on or off, saved at once
const GlitchSettings = ({ key, state, actions }) => {
  const list = effectsOf(state.theme)
  const now = list.filter((effect) => effect.glitch)
  const always = list.filter((effect) => !effect.glitch)
  const moving = now.filter((effect) => effect.moving).map((effect) => effect.name)
  return (
    <Overlay
      key={key}
      onKeyDown={(event) => event.keyCode === keys.esc && actions.toggleGlitches()}
    >
      <Dialog title="Glitches" onClose={actions.toggleGlitches}>
        <form
          class={s.root}
          autocomplete="off"
          onsubmit={(event) => {
            event.preventDefault()
            actions.toggleGlitches()
          }}
        >
          {now.length > 0 && <p class={g.group}>Now and then</p>}
          {now.map((effect) => (
            <Row effect={effect} on={state.effects[effect.id]} actions={actions} />
          ))}
          {always.length > 0 && <p class={g.group}>All the time</p>}
          {always.map((effect) => (
            <Row effect={effect} on={state.effects[effect.id]} actions={actions} />
          ))}
          <p class={s.credit}>
            {moving.length ? `${listed(moving)} show only over the animated background. ` : ''}
            Nothing glitches under Reduced Motion.
          </p>
          <div class={s.footer}>
            <Button onCreate={(el) => el.focus()}>
              <span class={s.button}>OK</span>
            </Button>
            <Button type="button" onClick={actions.resetEffects}>
              <span class={s.button}>Defaults</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </Overlay>
  )
}

export default GlitchSettings
