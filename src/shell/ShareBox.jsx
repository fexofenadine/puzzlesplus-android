import { h } from 'hyperapp'
import s from './Transfer.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'

//the board on screen as a link anyone can open
const Share = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={(event) => event.keyCode === 27 && actions.closeShare()}>
    <Dialog title="Copy Link" onClose={actions.closeShare}>
      <div class={s.root}>
        <p>
          This link opens the same board, from its start, for anyone. A board from a link keeps no
          best time.
        </p>
        <input
          class={s.field}
          type="text"
          readonly
          value={state.link}
          onfocus={(event) => event.target.select()}
        />
        <p class={s.note}>{state.copied ? 'Copied to the clipboard.' : ''}</p>
        <div class={s.footer}>
          <Button type="button" onClick={() => actions.copyShare()}>
            <span class={s.button}>Copy</span>
          </Button>
          <Button type="button" onClick={actions.closeShare} onCreate={(el) => el.focus()}>
            <span class={s.button}>Close</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default Share
