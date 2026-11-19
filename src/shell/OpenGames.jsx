import { h } from 'hyperapp'
import s from './OpenGames.module.css'
import a from './About.module.css'
import Overlay from '../Overlay'
import Dialog from '../Dialog'
import Button from '../Button'
import { games } from './GameLinks'
import { icons } from './Taskbar'

//arrows move the choice, enter opens it, esc brings the closed window back
const keyDown = (state, actions) => (event) => {
  const at = games.findIndex(([id]) => id === state.openGames)
  if (event.keyCode === 27) actions.openGame(state.page)
  else if (event.keyCode === 13) actions.openGame(state.openGames)
  else if (event.keyCode >= 37 && event.keyCode <= 40) {
    event.preventDefault()
    const step = { 37: -1, 39: 1, 38: -4, 40: 4 }[event.keyCode]
    const row = Math.abs(step) === 4
    const next = row
      ? Math.min(Math.max(at + step, at % 4), games.length - 1)
      : (at + step + games.length) % games.length
    actions.selectGame(games[next][0])
  }
}

//shown when the game window closes, pick a game to open
const OpenGames = ({ key, state, actions }) => (
  <Overlay key={key} onKeyDown={keyDown(state, actions)}>
    <Dialog title="Open Games" onClose={() => actions.openGame(state.page)}>
      <div class={s.root} oncreate={(el) => el.focus()} tabindex={-1}>
        <p class={s.text}>Choose a game to open.</p>
        <ul class={s.list} role="listbox">
          {games.map(([id, title]) => (
            <li
              role="option"
              aria-selected={id === state.openGames}
              class={id === state.openGames ? s.selected : s.option}
              onclick={() => actions.selectGame(id)}
              ondblclick={() => actions.openGame(id)}
            >
              <img src={icons[id]} alt="" width="32" height="32" />
              <span class={s.label}>{title}</span>
            </li>
          ))}
        </ul>
        <p class={s.text}>
          <a class={a.link} href="../how-to-play/" target="_blank" rel="noopener">
            How to play each game
          </a>
        </p>
        <div class={s.footer}>
          <Button type="button" onClick={() => actions.openGame(state.openGames)}>
            <span class={a.button}>OK</span>
          </Button>
          <Button type="button" onClick={() => actions.openGame(state.page)}>
            <span class={a.button}>Cancel</span>
          </Button>
        </div>
      </div>
    </Dialog>
  </Overlay>
)

export default OpenGames
