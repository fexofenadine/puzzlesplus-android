import { h } from 'hyperapp'
import s from './PhoneBar.module.css'
import { games } from './GameLinks'
import { book, help, icons } from './Taskbar'
import avatar from './avatar.png'
import { pageUrl } from './phone'

const MENU = 'M3 5h18v2.5H3zM3 10.75h18v2.5H3zM3 16.5h18V19H3z'
const BACK = 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z'
const PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'
const PLAY = 'M8 5v14l11-7z'

const Icon = ({ d }) => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

const Link = ({ icon, href, on }, children) => (
  <a class={on ? s.linkOn : s.link} href={pageUrl(href)}>
    <span class={s.icon}>{icon && <img src={icon} alt="" width="24" height="24" />}</span>
    {children}
  </a>
)

//picking a menu item does its thing and shuts the drawer, opening a section does not
const shutOnPick = (actions) => (event) => {
  if (event.target.closest('[class*="Menu_option"]')) actions.toggleDrawer()
}

//a phone's top bar, with the drawer behind its menu button
//a game passes its menu bar as children, to be shown as sections; back makes it a page's bar instead
const PhoneBar = (
  { key, title, page, root = '../', back, paused, canPause, state, actions },
  children,
) => (
  <div key={key}>
    <header class={s.bar}>
      {back ? (
        <a class={s.button} href={pageUrl(back)} title="Back">
          <Icon d={BACK} />
        </a>
      ) : (
        <button type="button" class={s.button} title="Menu" onclick={() => actions.toggleDrawer()}>
          <Icon d={MENU} />
        </button>
      )}
      <span class={s.title}>{title}</span>
      {!back && (
        <button
          type="button"
          class={s.button}
          title={paused ? 'Resume' : 'Pause'}
          disabled={!canPause}
          onclick={() => actions.pause()}
        >
          <Icon d={paused ? PLAY : PAUSE} />
        </button>
      )}
    </header>
    {state.drawer && <div class={s.shade} onclick={() => actions.toggleDrawer()} />}
    {state.drawer && (
      <nav class={s.drawer} onclick={shutOnPick(actions)}>
        <div class={s.head}>
          <img src={avatar} alt="" width="40" height="40" />
          Puzzles Plus
        </div>
        <div class={s.label}>Games</div>
        {games.map(([id, name]) => (
          <Link icon={icons[id]} href={`${root}${id}/`} on={id === page}>
            {name}
          </Link>
        ))}
        <div class={s.menu}>{children}</div>
        <div class={s.label}>Help</div>
        <Link icon={book} href="guide/">
          {games.find(([id]) => id === page)[1]} guide
        </Link>
        <Link icon={help} href={`${root}how-to-play/`}>
          How to play every game
        </Link>
      </nav>
    )}
  </div>
)

export default PhoneBar
