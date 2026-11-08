import { h } from 'hyperapp'
import s from './Prompt.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

//a game is in play and something would end it: park it for later, drop it, or keep playing
const Switching = ({ key, title, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.answerSwitch(null)}>
    <Dialog title={title} onClose={() => actions.answerSwitch(null)}>
      <div class={s.root}>
        <p class={s.text}>A game is in progress. Save it to resume later, or discard it?</p>
        <div class={s.footer}>
          <Button type="button" onClick={() => actions.answerSwitch('save')}>
            <span class={s.button}>Save</span>
          </Button>
          <Button type="button" onClick={() => actions.answerSwitch('discard')}>
            <span class={s.button}>Discard</span>
          </Button>
          <Button
            type="button"
            onClick={() => actions.answerSwitch(null)}
            onCreate={(el) => el.focus()}
          >
            <span class={s.button}>Cancel</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default Switching
