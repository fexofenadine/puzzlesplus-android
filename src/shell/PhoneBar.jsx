import { h } from 'hyperapp'
import s from './PhoneBar.module.css'
import { games } from './GameLinks'
import { book, help, icons } from './Taskbar'
import { backgroundFor } from './backgrounds'
import avatar from './avatar.png'
import { pageUrl } from './phone'
import { clockText } from './ResumeItems'

const MENU = 'M3 5h18v2.5H3zM3 10.75h18v2.5H3zM3 16.5h18V19H3z'
const BACK = 'M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z'
const PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'
const PLAY = 'M8 5v14l11-7z'
const NEW = 'M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z'
const HINT =
  'M11 18h2v-2h-2zm1-16a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-14a4 4 0 00-4 4h2a2 2 0 114 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 00-4-4z'

//short names and a swatch of each theme's title bar for the theme chips
const themeChips = [
  ['classic', 'Classic', '#0a246a'],
  ['synthwave', 'Synthwave', '#ff7edb'],
  ['matrix', 'Matrix', '#0b6e24'],
  ['nord', 'Nord', '#88c0d0'],
  ['solarized', 'Solarized', '#268bd2'],
  ['solarized-phosphor', 'Phosphor', '#2aa198'],
]

const Icon = ({ d }) => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

const BarButton = ({ title, d, disabled, onClick }) => (
  <button type="button" class={s.button} title={title} disabled={disabled} onclick={onClick}>
    <Icon d={d} />
  </button>
)

//a group of the drawer, its label optional
export const Section = ({ label }, children) => (
  <section class={s.section}>
    {label && <div class={s.label}>{label}</div>}
    {children}
  </section>
)

//one tap picks, the chosen one stays pressed in; picking closes the drawer
//options are [value, name, disabled?, swatch?]
export const Chips = ({ label, options, value, onPick, actions }) => [
  label && <div class={s.label}>{label}</div>,
  <div class={s.chips}>
    {options.map(([option, name, disabled, swatch]) => (
      <button
        type="button"
        class={option === value ? s.chipOn : s.chip}
        disabled={disabled}
        onclick={() => {
          actions.closeDrawer()
          onPick(option)
        }}
      >
        {swatch && <span class={s.swatch} style={{ background: swatch }} />}
        {name}
      </button>
    ))}
  </div>,
]

//an option that stays open so several can be changed
export const Check = ({ name, checked, onToggle }) => (
  <button type="button" class={s.row} role="checkbox" aria-checked={checked} onclick={onToggle}>
    <span class={checked ? s.checkOn : s.check} />
    {name}
  </button>
)

//an action that closes the drawer, then runs
export const Item = ({ glyph, icon, name, onClick, actions }) => (
  <button
    type="button"
    class={s.row}
    onclick={() => {
      actions.closeDrawer()
      onClick()
    }}
  >
    <span class={s.glyph}>{icon ? <img src={icon} alt="" width="22" height="22" /> : glyph}</span>
    {name}
  </button>
)

const go = (href) => () => location.assign(pageUrl(href))

//a phone's top bar, with the drawer behind its menu button: the games, the game's own sections
//(children), the theme and help; back makes it a page's bar instead, with only a back arrow
const PhoneBar = (
  { key, title, page, root = '../', back, paused, canPause, look, state, actions },
  children,
) => {
  const name = page && games.find(([id]) => id === page)[1]
  return (
    <div key={key}>
      <header class={s.bar}>
        {back ? (
          <a class={s.button} href={pageUrl(back)} title="Back">
            <Icon d={BACK} />
          </a>
        ) : (
          <BarButton title="Menu" d={MENU} onClick={() => actions.toggleDrawer()} />
        )}
        <span class={s.title}>{title}</span>
        {!back && <BarButton title="New game" d={NEW} onClick={() => actions.newGame()} />}
        {!back && <BarButton title="Hint" d={HINT} onClick={() => actions.hint()} />}
        {!back && (
          <BarButton
            title={paused ? 'Resume' : 'Pause'}
            d={paused ? PLAY : PAUSE}
            disabled={!canPause}
            onClick={() => actions.pause()}
          />
        )}
      </header>
      {state.drawer && <div class={s.shade} onclick={() => actions.closeDrawer()} />}
      {state.drawer && (
        <nav class={s.drawer}>
          <div class={s.head}>
            <img src={avatar} alt="" width="36" height="36" />
            Puzzles Plus
          </div>
          <Section>
            <div class={s.games}>
              {games.map(([id, gameName]) => (
                <button
                  type="button"
                  class={id === page ? s.gameOn : s.game}
                  onclick={id === page ? () => actions.closeDrawer() : go(`${root}${id}/`)}
                >
                  <img src={icons[id]} alt="" width="28" height="28" />
                  {gameName}
                </button>
              ))}
            </div>
          </Section>
          {children}
          {state.shelf && state.shelf.length > 0 && (
            <Section label="Resume">
              {state.shelf.map(({ id, label, elapsed }) => (
                <Item
                  glyph="▶"
                  name={`${label} ${clockText(elapsed)}`}
                  onClick={() => actions.resumeGame(id)}
                  actions={actions}
                />
              ))}
            </Section>
          )}
          <Section>
            <Chips
              label="Theme"
              options={themeChips.map(([id, themeName, swatch]) => [id, themeName, false, swatch])}
              value={state.theme}
              onPick={actions.setTheme}
              actions={actions}
            />
            {look}
            <Item
              glyph="⚙"
              name={backgroundFor(state.theme) ? 'Background settings' : 'Window settings'}
              onClick={actions.toggleBackgroundSettings}
              actions={actions}
            />
            <Check
              name="Hide window"
              checked={state.glass.hidden}
              onToggle={actions.toggleHideWindow}
            />
          </Section>
          <Section>
            <Item icon={book} name={`${name} guide`} onClick={go('guide/')} actions={actions} />
            <Item
              icon={help}
              name="How to play every game"
              onClick={go(`${root}how-to-play/`)}
              actions={actions}
            />
            <Item glyph="ℹ" name="About" onClick={actions.toggleAbout} actions={actions} />
          </Section>
        </nav>
      )}
    </div>
  )
}

export default PhoneBar
