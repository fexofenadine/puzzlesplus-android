import { h } from 'hyperapp'
import s from './Taskbar.module.css'
import { games } from './GameLinks'
import Backup from './BackupBox'
import Share from './ShareBox'
import avatar from './avatar.png'
import minesweeper from './icons/minesweeper.png'
import takuzu from './icons/takuzu.png'
import nonograms from './icons/nonograms.png'
import sudoku from './icons/sudoku.png'
import twenty48 from './icons/2048.png'
import help from './icons/help.svg'
import book from './icons/book.svg'

export const icons = { minesweeper, takuzu, nonograms, sudoku, 2048: twenty48 }
export { book, help }

const REPO = 'https://github.com/fexofenadine/puzzlesplus'

//the tray clock keeps its own time, so the game never redraws for it
const clock = (el) => {
  const show = () => {
    el.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  show()
  setInterval(show, 1000)
}

//closes the start menu when focus leaves it, like the menu bar
const leave = (actions) => (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) actions.closeMenu()
}

const StartItem = ({ icon, onClick }, children) => (
  <li>
    <button type="button" class={s.item} tabindex={-1} onclick={onClick}>
      <span class={s.itemIcon}>{icon && <img src={icon} alt="" width="24" height="24" />}</span>
      {children}
    </button>
  </li>
)

//a page of the site, the start menu closing behind it
const go = (actions, href) => () => {
  actions.closeMenu()
  location.assign(href)
}

//a windows 95 taskbar: start menu, a button per game and a tray with the boss key and clock
//name is for the about item, own is a page's window that is not a game, { title, icon }
const Taskbar = ({ key, name, own, state, actions }) => {
  const open = state.menu && state.menu.start
  const { root } = state
  return [
    <footer key={key} class={s.root}>
      <div class={s.start} tabindex={-1} onfocusout={leave(actions)}>
        <button
          type="button"
          class={open ? s.pressed : s.button}
          tabindex={-1}
          title="Start"
          onclick={() => actions.toggleStart()}
        >
          <img class={s.avatar} src={avatar} alt="" width="16" height="16" />
          <span class={s.startLabel}>Start</span>
        </button>
        {open && (
          <div class={s.menu}>
            <div class={s.banner}>
              Puzzles <b>Plus</b>
            </div>
            <ul class={s.list}>
              {games.map(([id, title]) => (
                <StartItem icon={icons[id]} onClick={() => actions.openGame(id)}>
                  {title}
                </StartItem>
              ))}
              <li class={s.separator} />
              <StartItem icon={help} onClick={go(actions, `${root}how-to-play/`)}>
                How to Play
              </StartItem>
              {games.map(([id, title]) => (
                <StartItem icon={book} onClick={go(actions, `${root}${id}/guide/`)}>
                  {title} Guide
                </StartItem>
              ))}
              <li class={s.separator} />
              <StartItem onClick={() => actions.toggleBackup()}>Backup...</StartItem>
              {name && <StartItem onClick={() => actions.toggleAbout()}>About {name}...</StartItem>}
              <StartItem
                icon={avatar}
                onClick={() => {
                  actions.closeMenu()
                  window.open(REPO, '_blank', 'noopener')
                }}
              >
                GitHub
              </StartItem>
            </ul>
          </div>
        )}
      </div>
      <div class={s.tasks}>
        {games.map(([id, title]) => (
          <button
            type="button"
            class={id === state.page && state.windowState === 'open' ? s.taskPressed : s.task}
            tabindex={-1}
            title={title}
            onclick={() => actions.taskbarGame(id)}
          >
            <img src={icons[id]} alt="" width="16" height="16" />
            <span class={s.name}>{title}</span>
          </button>
        ))}
        {own && (
          <button
            type="button"
            class={state.windowState === 'open' ? s.taskPressed : s.task}
            tabindex={-1}
            title={own.title}
            onclick={() => actions.taskbarGame(state.page)}
          >
            <img src={own.icon} alt="" width="16" height="16" />
            <span class={s.name}>{own.title}</span>
          </button>
        )}
      </div>
      <div class={s.tray}>
        <button
          type="button"
          class={s.boss}
          tabindex={-1}
          title="Boss key (Esc)"
          onclick={() => actions.boss()}
        >
          Esc
        </button>
        <span class={s.clock} oncreate={clock} />
      </div>
    </footer>,
    state.share && <Share key="share" state={state.share} actions={actions} />,
    state.backup && <Backup key="backup" state={state.backup} actions={actions} />,
  ]
}

export default Taskbar
